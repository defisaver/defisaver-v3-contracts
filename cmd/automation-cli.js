require('dotenv-safe').config();

const ethers = require('ethers');
const fs = require('fs');
const path = require('path');
const { program } = require('commander');

const { addrs, generateIds } = require('../test/utils/utils');

const strategyStorageAbi =
    require('../artifacts/contracts/core/strategy/StrategyStorage.sol/StrategyStorage.json').abi;
const bundleStorageAbi =
    require('../artifacts/contracts/core/strategy/BundleStorage.sol/BundleStorage.json').abi;

let sdkBundleEnums;

try {
    // eslint-disable-next-line global-require
    const { enums } = require('@defisaver/automation-sdk');
    sdkBundleEnums = enums.Bundles;
} catch {
    sdkBundleEnums = undefined;
}

let network = 'mainnet';

const getBundleNamesForNetwork = () => {
    const enumName = {
        mainnet: 'MainnetIds',
        optimism: 'OptimismIds',
        arbitrum: 'ArbitrumIds',
        base: 'BaseIds',
    }[network];

    return sdkBundleEnums?.[enumName];
};

const setStrategyAndBundleContracts = async (options) => {
    network = options.network.length === 0 ? 'mainnet' : options.network;

    const nodeName = network !== 'mainnet' ? `${network.toUpperCase()}_NODE` : 'ETHEREUM_NODE';

    const provider = new ethers.providers.WebSocketProvider(process.env[nodeName]);

    const strategyStorage = new ethers.Contract(
        addrs[network].STRATEGY_STORAGE_ADDR,
        strategyStorageAbi,
        provider,
    );

    const bundleStorage = new ethers.Contract(
        addrs[network].BUNDLE_STORAGE_ADDR,
        bundleStorageAbi,
        provider,
    );

    return { strategyStorage, bundleStorage };
};

const getStrategy = async (id, options) => {
    const { strategyStorage } = await setStrategyAndBundleContracts(options);

    const strategy = await strategyStorage.getStrategy(id);

    console.log(strategy);
};

const writeCsv = (rows, columns, outputFile) => {
    const escapeCsvValue = (value) => {
        const stringValue = String(value);

        if (/[",\n]/.test(stringValue)) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }

        return stringValue;
    };

    const csv = [
        columns.join(','),
        ...rows.map((row) => columns.map((column) => escapeCsvValue(row[column])).join(',')),
    ].join('\n');
    const filePath = path.resolve(outputFile);

    fs.writeFileSync(filePath, `${csv}\n`);
    console.log(`Export written to ${filePath}`);
};

const getAllBundles = async (bundleStorage) => {
    const bundleCount = await bundleStorage.getBundleCount();

    return bundleStorage.getPaginatedBundles(0, bundleCount.toString());
};

const exportAllStrategies = async (options) => {
    const { strategyStorage, bundleStorage } = await setStrategyAndBundleContracts(options);
    const strategyCount = await strategyStorage.getStrategyCount();
    const [strategies, bundles] = await Promise.all([
        strategyStorage.getPaginatedStrategies(0, strategyCount.toString()),
        getAllBundles(bundleStorage),
    ]);
    const strategyBundles = {};

    bundles.forEach((bundle, bundleId) => {
        bundle.strategyIds.forEach((strategyId) => {
            const id = strategyId.toString();

            strategyBundles[id] = strategyBundles[id] || [];
            strategyBundles[id].push(bundleId);
        });
    });

    const bundleNames = getBundleNamesForNetwork();
    const rows = strategies.map((strategy, strategyId) => {
        const bundleIds = strategyBundles[strategyId] || [];
        const row = {
            strategyId,
            name: strategy.name,
            bundles: JSON.stringify(bundleIds),
            triggerIds: JSON.stringify(strategy.triggerIds),
            actionIds: JSON.stringify(strategy.actionIds),
            paramMapping: JSON.stringify(strategy.paramMapping),
        };

        if (bundleNames) {
            row.bundleNames = JSON.stringify(
                bundleIds.map((bundleId) => bundleNames[bundleId] || ''),
            );
        }

        return row;
    });
    const columns = ['strategyId', 'name', 'bundles'];

    if (!options.simple) {
        if (bundleNames) {
            columns.push('bundleNames');
        }
        columns.push('triggerIds', 'actionIds', 'paramMapping');
    }

    console.table(rows, columns);
    writeCsv(rows, columns, options.output);
};

const exportAllBundles = async (options) => {
    const { strategyStorage, bundleStorage } = await setStrategyAndBundleContracts(options);
    const strategyCount = await strategyStorage.getStrategyCount();
    const [strategies, bundles] = await Promise.all([
        strategyStorage.getPaginatedStrategies(0, strategyCount.toString()),
        getAllBundles(bundleStorage),
    ]);
    const bundleNames = getBundleNamesForNetwork();
    const rows = bundles.map((bundle, bundleId) => {
        const row = {
            bundleId,
            strategyIds: JSON.stringify(
                bundle.strategyIds.map((strategyId) => strategyId.toString()),
            ),
            strategyNames: JSON.stringify(
                bundle.strategyIds.map((strategyId) => strategies[strategyId.toString()].name),
            ),
        };

        if (bundleNames) {
            row.bundleName = bundleNames[bundleId] || '';
        }

        return row;
    });
    const columns = ['bundleId'];

    if (bundleNames) {
        columns.push('bundleName');
    }

    columns.push('strategyIds', 'strategyNames');

    console.table(rows, columns);
    writeCsv(rows, columns, options.output);
};

const getAllStrategies = async (options) => {
    const { strategyStorage, bundleStorage } = await setStrategyAndBundleContracts(options);

    const numStrategies = await strategyStorage.getStrategyCount();
    const strategies = await strategyStorage.getPaginatedStrategies(0, numStrategies.toString());

    const numBundles = await bundleStorage.getBundleCount();
    const bundles = await bundleStorage.getPaginatedBundles(0, numBundles.toString());

    const strategyInBundleMap = {};

    bundles.forEach((bundle, i) => {
        bundle.strategyIds.forEach((strategyId) => {
            strategyInBundleMap[strategyId.toString()] = i;
        });
    });

    const idsMap = generateIds();

    const formattedStrategies = strategies.map((strategy, index) => {
        const strategyInfo = {
            name: strategy.name,
            id: index,
            isContinuous: strategy.continuous,
            triggerIds: strategy.triggerIds.map((triggerId) =>
                idsMap[triggerId]?.fileName?.toString(),
            ),
            actionIds: strategy.actionIds.map((actionId) => idsMap[actionId]?.fileName?.toString()),
            paramMapping: strategy.paramMapping.map((param) =>
                param.map((p) => {
                    if (p === 254) return '&proxy';
                    if (p === 255) return '&eoa';

                    if (p <= 127 && p > 0) {
                        return `$${p}`;
                    }

                    if (p >= 128 && p <= 253) {
                        return `&${p - 127}`;
                    }

                    return p;
                }),
            ),
        };

        if (strategyInBundleMap[index] !== undefined) {
            strategyInfo.bundleId = strategyInBundleMap[index];
        }
        return strategyInfo;
    });

    const filePath = path.join(__dirname, '..', 'addresses', 'strategies', `${network}.json`);

    fs.writeFileSync(filePath, JSON.stringify(formattedStrategies, null, 2));

    console.log(`Strategies written to ${filePath}`);
};

(async () => {
    program
        .command('get-strategy <id>')
        .option('-n, --network <network>', 'Specify network we are calling (defaults to L1)', [])
        .description('Returns strategy data based on id')
        .action(async (id, options) => {
            await getStrategy(id, options);
            process.exit(0);
        });

    program
        .command('sync-strategies')
        .option('-n, --network <network>', 'Specify network we are calling (defaults to L1)', [])
        .description(
            'Fetches all strategies from on-chain and writes to file in addresses/strategies/<network>.json',
        )
        .action(async (options) => {
            await getAllStrategies(options);
            process.exit(0);
        });

    program
        .command('export-all-strategies')
        .option('-n, --network <network>', 'Specify network we are calling (defaults to L1)', [])
        .option('-o, --output <file>', 'CSV output file', 'out.csv')
        .option('--simple', 'Only export strategy ID, name and bundles')
        .description('Prints all strategies and exports them to CSV')
        .action(async (options) => {
            await exportAllStrategies(options);
            process.exit(0);
        });

    program
        .command('export-all-bundles')
        .option('-n, --network <network>', 'Specify network we are calling (defaults to L1)', [])
        .option('-o, --output <file>', 'CSV output file', 'out.csv')
        .description('Prints all bundles and exports them to CSV')
        .action(async (options) => {
            await exportAllBundles(options);
            process.exit(0);
        });

    program.parse(process.argv);
})();
