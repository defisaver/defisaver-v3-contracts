/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable max-len */
require('dotenv-safe').config();

const ethers = require('ethers');
const fs = require('fs');
const path = require('path');
const { program } = require('commander');

const {
    addrs,
    generateIds,
} = require('../test/utils');

const strategyStorageAbi = require('../artifacts/contracts/core/strategy/StrategyStorage.sol/StrategyStorage.json').abi;
const bundleStorageAbi = require('../artifacts/contracts/core/strategy/BundleStorage.sol/BundleStorage.json').abi;

let network = 'mainnet';

const setStrategyAndBundleContracts = async (options) => {
    network = options.network.length === 0 ? 'mainnet' : options.network;

    const nodeName = network !== 'mainnet' ? `${network.toUpperCase()}_NODE` : 'ETHEREUM_NODE';

    const provider = new ethers.providers.WebSocketProvider(process.env[nodeName]);

    const strategyStorage = new ethers.Contract(addrs[network].STRATEGY_STORAGE_ADDR, strategyStorageAbi, provider);

    const bundleStorage = new ethers.Contract(addrs[network].BUNDLE_STORAGE_ADDR, bundleStorageAbi, provider);

    return { strategyStorage, bundleStorage };
};

const getStrategy = async (id, options) => {
    const { strategyStorage } = await setStrategyAndBundleContracts(options);

    const strategy = await strategyStorage.getStrategy(id);

    console.log(strategy);
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
            triggerIds: strategy.triggerIds.map((triggerId) => idsMap[triggerId]?.fileName?.toString()),
            actionIds: strategy.actionIds.map((actionId) => idsMap[actionId]?.fileName?.toString()),
            paramMapping: strategy.paramMapping.map((param) => param.map((p) => {
                if (p === 254) return '&proxy';
                if (p === 255) return '&eoa';

                if (p <= 127 && p > 0) {
                    return `$${p}`;
                }

                if (p >= 128 && p <= 253) {
                    return `&${p - 127}`;
                }

                return p;
            })),
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
        .description('Fetches all strategies from on-chain and writes to file in addresses/strategies/<network>.json')
        .action(async (options) => {
            await getAllStrategies(options);
            process.exit(0);
        });

    program.parse(process.argv);
})();
