require('dotenv-safe').config();
require('@nomiclabs/hardhat-waffle');
require('@nomicfoundation/hardhat-verify');
require('@nomiclabs/hardhat-ethers');
require('hardhat-gas-reporter');
require('hardhat-log-remover');
// require('hardhat-tracer');
require('@tenderly/hardhat-tenderly');
require('solidity-coverage');

const path = require('path');
const { solidity, wethAddress, hardhatNetworks } = require('./scripts/deployment/config');
const { subtask } = require('hardhat/config');
const { TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS } = require('hardhat/builtin-tasks/task-names');
const { glob } = require('hardhat/internal/util/glob');

// Compile test-only encoder helpers alongside the regular `contracts/` tree
// without changing `paths.sources` (which only accepts a single directory).
// This lets JS tests call `test-sol/utils/ActionsUtils.sol` and the libraries
// under `test-sol/utils/encode/` directly
subtask(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS, async (_, { config }, runSuper) => {
    const defaultPaths = await runSuper();
    const extraPatterns = ['test-sol/utils/ActionsUtils.sol', 'test-sol/utils/encode/**/*.sol'];
    const extraPaths = (
        await Promise.all(extraPatterns.map((p) => glob(path.join(config.paths.root, p))))
    ).flat();
    return [...new Set([...defaultPaths, ...extraPaths])];
});

const Dec = require('decimal.js');
const dfs = require('@defisaver/sdk');

dfs.configure({
    testingMode: true,
});

Dec.set({
    precision: 50,
    rounding: 4,
    toExpNeg: -7,
    toExpPos: 21,
    maxE: 9e15,
    minE: -9e15,
    modulo: 1,
    crypto: false,
});

const MAX_NODE_COUNT = 22;
const testNetworks = Object.fromEntries(
    [...Array(MAX_NODE_COUNT).keys()].map((c, i) => [
        `local${i}`,
        { url: `http://127.0.0.1:${8545 + i}`, timeout: 10000000, name: 'mainnet' },
    ]),
);
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    defaultNetwork: 'hardhat',
    lightTesting: true,
    isWalletSafe: true,
    gasReporter: {
        currency: 'EUR',
        enabled: false,
    },
    networks: {
        ...testNetworks,
        local: {
            url: 'http://127.0.0.1:8545',
            timeout: 1000000,
            gasPrice: 170000000000,
            name: 'mainnet',
            chainId: 1,
            hardfork: 'cancun',
        },
        localOptimism: {
            url: 'http://127.0.0.1:8545',
            timeout: 1000000,
            gasPrice: 1883022292,
            name: 'optimism',
            chainId: 10,
        },
        localArbitrum: {
            url: 'http://127.0.0.1:8545',
            timeout: 1000000,
            gasPrice: 1700000000,
            name: 'arbitrum',
            chainId: 42161,
        },
        localBase: {
            url: 'http://127.0.0.1:8545',
            timeout: 1000000,
            gasPrice: 1700000000,
            name: 'base',
            chainId: 8453,
        },
        anvil: {
            name: 'mainnet',
            isAnvil: true,
            url: 'http://127.0.0.1:8545',
            chainId: 1,
        },
        fork: {
            url: `https://virtual.mainnet.eu.rpc.tenderly.co/${process.env.FORK_ID}`,
            timeout: 1000000,
            type: 'tenderly',
            name: 'mainnet',
            hardfork: 'cancun',
            chainId: 1,
        },
        hardhat: {
            chains: {
                42161: {
                    hardforkHistory: {
                        london: 1,
                    },
                },
                10: {
                    hardforkHistory: {
                        london: 1,
                    },
                },
                8453: {
                    hardforkHistory: {
                        osaka: 1,
                    },
                },
            },
            forking: {
                url: process.env.ETHEREUM_NODE,
                timeout: 1000000,
                gasPrice: 50000000000,
                // blockNumber: 12068716
            },
            name: 'mainnet',
            hardfork: 'osaka',
            blockGasLimit: 0x1fffffffffffff,
            accounts: {
                balance: '10000000000000000000000000000',
                privateKey: process.env.PRIV_KEY_MAINNET,
            },
            chainId: 1,
        },
        ...hardhatNetworks(),
    },
    solidity,
    paths: {
        sources: './contracts',
        tests: './test',
        cache: './cache',
        artifacts: './artifacts',
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY,
    },
    tenderly: {
        username: process.env.TENDERLY_USERNAME,
        project: process.env.TENDERLY_PROJECT,
        forkNetwork: '1',
    },
    mocha: {
        timeout: 100000,
    },
    wethAddress,
};

require('./scripts/hardhat-tasks');
