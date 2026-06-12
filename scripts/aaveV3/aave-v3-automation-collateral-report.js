const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Decimal = require('decimal.js');
const { getAssetInfo } = require('@defisaver/tokens');

const API_URL = 'https://stats.defisaver.com/api/automation/subs/';
const PROTOCOL_ID = 'Aave__V3';
const DEFAULT_OUTPUT_PATH = path.join(__dirname, 'aave-v3-automation-collateral-report.txt');

const NETWORKS = {
    mainnet: {
        chainId: 1,
        title: 'MAINNET',
        collateralSymbols: [
            'ezETH',
            'DAI',
            'LINK',
            'USDe',
            'sUSDe',
            'osETH',
            'EURC',
            'XAUT',
            'USDS',
            'LUSD',
            'CRV',
            'UNI',
            'tETH',
            'LDO',
        ],
    },
    arbitrum: {
        chainId: 42161,
        title: 'ARBITRUM',
        collateralSymbols: ['AAVE', 'DAI', 'LINK', 'ARB', 'tBTC', 'USDC.e', 'ezETH'],
    },
    base: {
        chainId: 8453,
        title: 'BASE',
        collateralSymbols: ['AAVE', 'EURC', 'LBTC', 'tBTC', 'USDbc'],
    },
    optimism: {
        chainId: 10,
        title: 'OPTIMISM',
        collateralSymbols: ['rETH', 'OP', 'LINK', 'USDC.e', 'DAI'],
    },
};

const STRATEGY_LABELS = {
    'collateral-switch': 'collateral switch',
    'eoa-boost-on-price': 'boost on price',
    'eoa-close-on-price': 'close on price',
    'eoa-repay-on-price': 'repay on price',
    'open-order-from-collateral': 'open order from collateral',
    'repay-on-price': 'repay on price',
    'stop-loss': 'stop loss',
    'stop-loss-with-gas-price': 'stop loss',
    'take-profit': 'take profit',
    'take-profit-with-gas-price': 'take profit',
};

const buildChainIdToNetwork = () =>
    Object.entries(NETWORKS).reduce((acc, [network, config]) => {
        acc[config.chainId] = network;
        return acc;
    }, {});

const buildTargetSymbolSets = () =>
    Object.entries(NETWORKS).reduce((acc, [network, config]) => {
        const targetSymbols = new Set();

        config.collateralSymbols.forEach((symbol) => {
            targetSymbols.add(symbol.toLowerCase());

            const assetInfo = getAssetInfo(symbol, config.chainId);
            if (assetInfo.symbol) {
                targetSymbols.add(assetInfo.symbol.toLowerCase());
            }
        });

        acc[network] = targetSymbols;
        return acc;
    }, {});

const parseArgs = (argv) => {
    const options = {
        input: null,
        output: DEFAULT_OUTPUT_PATH,
    };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];

        if (arg === '--help' || arg === '-h') {
            options.help = true;
        } else if (arg === '--input') {
            options.input = argv[i + 1];
            i++;
        } else if (arg === '--output') {
            options.output = argv[i + 1];
            i++;
        } else {
            throw new Error(`Unknown argument: ${arg}`);
        }
    }

    if (options.input === undefined) {
        throw new Error('Missing value for --input');
    }

    if (options.output === undefined) {
        throw new Error('Missing value for --output');
    }

    return options;
};

const printHelp = () => {
    console.log(`Usage: node scripts/aaveV3/aave-v3-automation-collateral-report.js [options]

Options:
  --input <path>   Process a saved API response instead of fetching live data
  --output <path>  Output txt file path
  -h, --help       Show this help message
`);
};

const readSubs = async (inputPath) => {
    if (inputPath) {
        const data = await fs.promises.readFile(inputPath, 'utf8');
        return JSON.parse(data);
    }

    const response = await axios.get(API_URL, {
        timeout: 60000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
    });

    return response.data;
};

const getDecodedOwner = (sub) => {
    const decoded = sub.strategyData && sub.strategyData.decoded;
    const subDataOwner = decoded && decoded.subData && decoded.subData.owner;
    const triggerDataOwner = decoded && decoded.triggerData && decoded.triggerData.owner;

    return subDataOwner || triggerDataOwner || null;
};

const getUsedAssets = (sub) =>
    Object.entries((sub.positionInfo && sub.positionInfo.usedAssets) || {}).map(([key, asset]) => ({
        ...asset,
        symbol: asset.symbol || key,
    }));

const isTargetCollateralPosition = (sub, network, targetSymbolSets) =>
    getUsedAssets(sub).some(
        (asset) =>
            asset.collateral === true &&
            targetSymbolSets[network].has((asset.symbol || '').toLowerCase()),
    );

const addToSet = (set, value) => {
    if (value !== undefined && value !== null && value !== '') {
        set.add(value);
    }
};

const addArrayToSet = (set, values) => {
    values.forEach((value) => addToSet(set, value));
};

const getSubIds = (sub) => {
    if (Array.isArray(sub.subIds) && sub.subIds.length > 0) {
        return sub.subIds;
    }

    return [sub.subId];
};

const getStrategyLabels = (sub) => {
    const strategyId = sub.strategy && sub.strategy.strategyId;
    const labels = [];

    if (strategyId === 'leverage-management' || strategyId === 'leverage-management-eoa') {
        if (sub.specific && sub.specific.repayEnabled) {
            labels.push('repay');
        }

        if (sub.specific && sub.specific.boostEnabled) {
            labels.push('boost');
        }

        if (labels.length === 0) {
            labels.push('leverage management');
        }

        return labels;
    }

    if (STRATEGY_LABELS[strategyId]) {
        return [STRATEGY_LABELS[strategyId]];
    }

    if (!strategyId) {
        return ['n/a'];
    }

    return [strategyId.replace(/^eoa-/, '').replace(/-/g, ' ')];
};

const getPositionKey = (network, sub) => `${network}:${sub.positionId || sub.subHash || sub.subId}`;

const createPositionGroup = (network, sub) => ({
    network,
    positionId: sub.positionId || 'n/a',
    owners: new Set(),
    eoaOwners: new Set(),
    subIds: new Set(),
    automationLabels: new Set(),
    positionInfo: sub.positionInfo || {},
});

const groupMatchingSubs = (subs) => {
    const chainIdToNetwork = buildChainIdToNetwork();
    const targetSymbolSets = buildTargetSymbolSets();
    const groups = new Map();

    subs.forEach((sub) => {
        const network = chainIdToNetwork[sub.chainId];

        if (!network || !sub.protocol || sub.protocol.id !== PROTOCOL_ID) {
            return;
        }

        if (!isTargetCollateralPosition(sub, network, targetSymbolSets)) {
            return;
        }

        const key = getPositionKey(network, sub);
        const group = groups.get(key) || createPositionGroup(network, sub);
        groups.set(key, group);

        addToSet(group.owners, sub.owner);
        addToSet(group.eoaOwners, getDecodedOwner(sub));
        addArrayToSet(group.subIds, getSubIds(sub));
        addArrayToSet(group.automationLabels, getStrategyLabels(sub));
    });

    return Array.from(groups.values());
};

const toDecimal = (value) => {
    try {
        const decimal = new Decimal(value || 0);
        return decimal.isFinite() ? decimal : null;
    } catch (error) {
        return null;
    }
};

const formatNumber = (value, decimals = 2) => {
    const decimal = toDecimal(value);

    if (!decimal) {
        return value === undefined || value === null || value === '' ? 'n/a' : String(value);
    }

    return decimal.toFixed(decimals).replace(/\.?0+$/, '');
};

const formatUsd = (value) => {
    const decimal = toDecimal(value);

    if (!decimal) {
        return value === undefined || value === null || value === '' ? 'n/a' : `$${value}`;
    }

    return `$${decimal
        .toFixed(2)
        .replace(/\B(?=(\d{3})+(?!\d))/g, ',')
        .replace(/\.00$/, '')}`;
};

const formatSet = (set) => {
    const values = Array.from(set);
    return values.length > 0 ? values.join(', ') : 'n/a';
};

const formatSubIds = (set) => {
    const values = Array.from(set).sort((a, b) => Number(a) - Number(b));
    return values.length > 0 ? values.join(', ') : 'n/a';
};

const formatAsset = (asset, amountKey, usdKey) => {
    const amount = formatNumber(asset[amountKey], 6);
    const usd = formatUsd(asset[usdKey]);

    return `${asset.symbol}: ${amount} (${usd})`;
};

const getCollateralAssets = (group) =>
    getUsedAssets({ positionInfo: group.positionInfo }).filter(
        (asset) => asset.collateral === true,
    );

const getDebtAssets = (group) =>
    getUsedAssets({ positionInfo: group.positionInfo }).filter(
        (asset) => asset.isBorrowed === true,
    );

const getMatchedCollateralSymbols = (group) => {
    const targetSymbolSets = buildTargetSymbolSets();

    return getCollateralAssets(group)
        .filter((asset) => targetSymbolSets[group.network].has((asset.symbol || '').toLowerCase()))
        .map((asset) => asset.symbol);
};

const compareGroupsByCollSize = (a, b) => {
    const aValue = toDecimal(a.positionInfo.suppliedCollateralUsd);
    const bValue = toDecimal(b.positionInfo.suppliedCollateralUsd);

    if (!aValue && !bValue) {
        return 0;
    }

    if (!aValue) {
        return 1;
    }

    if (!bValue) {
        return -1;
    }

    return bValue.comparedTo(aValue);
};

const buildReport = (groups) => {
    const lines = [
        'AAVE V3 AUTOMATION COLLATERAL REPORT',
        `Generated at: ${new Date().toISOString()}`,
        `Source: ${API_URL}`,
        '',
    ];

    Object.entries(NETWORKS).forEach(([network, config]) => {
        const networkGroups = groups
            .filter((group) => group.network === network)
            .sort(compareGroupsByCollSize);

        lines.push(config.title);
        lines.push('='.repeat(config.title.length));
        lines.push(`positions: ${networkGroups.length}`);
        lines.push('');

        if (networkGroups.length === 0) {
            lines.push('No matching positions.');
            lines.push('');
            return;
        }

        networkGroups.forEach((group, index) => {
            const collateralAssets = getCollateralAssets(group);
            const debtAssets = getDebtAssets(group);
            const matchedCollateralSymbols = getMatchedCollateralSymbols(group);

            lines.push(`${index + 1}.`);
            lines.push(`eoa: ${formatSet(group.eoaOwners)}`);
            lines.push(`sw: ${formatSet(group.owners)}`);
            lines.push(`positionId: ${group.positionId}`);
            lines.push(`subIds: ${formatSubIds(group.subIds)}`);
            lines.push(`ratio: ${formatNumber(group.positionInfo.ratio, 2)}`);
            lines.push(`collSize: ${formatUsd(group.positionInfo.suppliedCollateralUsd)}`);
            lines.push(`debtSize: ${formatUsd(group.positionInfo.borrowedUsd)}`);
            lines.push(
                `matched coll tokens: ${
                    matchedCollateralSymbols.length > 0
                        ? matchedCollateralSymbols.join(', ')
                        : 'n/a'
                }`,
            );
            lines.push(
                `coll tokens used: ${
                    collateralAssets.length > 0
                        ? collateralAssets
                              .map((asset) => formatAsset(asset, 'supplied', 'suppliedUsd'))
                              .join(', ')
                        : 'n/a'
                }`,
            );
            lines.push(
                `debt tokens used: ${
                    debtAssets.length > 0
                        ? debtAssets
                              .map((asset) => formatAsset(asset, 'borrowed', 'borrowedUsd'))
                              .join(', ')
                        : 'n/a'
                }`,
            );
            lines.push(`automations: ${formatSet(group.automationLabels)}`);
            lines.push('');
        });

        lines.push('---------');
        lines.push('');
    });

    const totalByNetwork = Object.keys(NETWORKS)
        .map((network) => {
            const count = groups.filter((group) => group.network === network).length;
            return `${network}: ${count}`;
        })
        .join(', ');

    lines.push(`TOTAL POSITIONS: ${groups.length}`);
    lines.push(`COUNTS BY NETWORK: ${totalByNetwork}`);

    return `${lines.join('\n')}\n`;
};

const ensureArray = (subs) => {
    if (!Array.isArray(subs)) {
        throw new Error('Expected API response to be a JSON array');
    }
};

const main = async () => {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
        printHelp();
        return;
    }

    const subs = await readSubs(options.input);
    ensureArray(subs);

    const groups = groupMatchingSubs(subs);
    const report = buildReport(groups);
    const outputPath = path.resolve(options.output);

    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.promises.writeFile(outputPath, report, 'utf8');

    console.log(`Wrote ${groups.length} Aave V3 positions to ${outputPath}`);
};

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
