/* eslint-disable import/no-extraneous-dependencies */
require('dotenv-safe').config();
require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-etherscan');
require('@tenderly/hardhat-tenderly');
require('@nomiclabs/hardhat-ethers');
// require("hardhat-gas-reporter");
require('hardhat-log-remover');

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    defaultNetwork: 'fork',
    networks: {
        local: {
            url: 'http://127.0.0.1:8545',
            timeout: 1000000,
            gasPrice: 170000000000,
            name: 'mainnet',
        },
        localOptimism: {
            url: 'http://127.0.0.1:8545',
            timeout: 1000000,
            gasPrice: 1883022292,
            name: 'optimism',
        },
        fork: {
            url: `https://rpc.tenderly.co/fork/${process.env.FORK_ID}`,
            timeout: 1000000,
        },
        hardhat: {
            forking: {
                url: process.env.ETHEREUM_NODE,
                timeout: 1000000,
                gasPrice: 170000000000,
                // blockNumber: 12068716
            },
        },
        // NETWORKS FOR DEPLOYING
        mainnet: {
            url: process.env.ETHEREUM_NODE,
            accounts: [process.env.PRIV_KEY_MAINNET],
            name: 'mainnet',
            txType: 2,
            blockExplorer: 'etherscan',
            contractVerification: true,
        },
        kovan: {
            url: process.env.KOVAN_ETHEREUM_NODE,
            chainId: 42,
            accounts: [process.env.PRIV_KEY_KOVAN],
            name: 'kovan',
            txType: 2,
            blockExplorer: 'etherscan',
            contractVerification: true,
        },
        kovanOptimism: {
            url: process.env.KOVAN_OPTIMISM_NODE,
            chainId: 69,
            accounts: [process.env.PRIV_KEY_KOVAN],
            name: 'kovan-optimistic',
            txType: 0,
            blockExplorer: 'etherscan',
            contractVerification: false,
        },
        optimism: {
            url: process.env.OPTIMISM_NODE,
            chainId: 10,
            accounts: [process.env.PRIV_KEY_KOVAN],
            name: 'optimistic',
            txType: 0,
            blockExplorer: 'etherscan',
            contractVerification: false,
        },
        rinkebyArbitrum: {
            url: process.env.RINKEBY_ARBITRUM_NODE,
            chainID: 421611,
            accounts: [process.env.PRIV_KEY_KOVAN],
            name: 'testnet',
            txType: 0,
            blockExplorer: 'arbiscan',
            contractVerification: true,
        },
        arbitrum: {
            url: process.env.ARBITRUM_NODE,
            chainId: 42161,
            accounts: [process.env.PRIV_KEY_KOVAN],
            name: 'arbitrum',
            txType: 0,
            blockExplorer: 'arbiscan',
            contractVerification: true,
        },
    },
    solidity: {
        version: '0.8.10',
        settings: {
            optimizer: {
                enabled: true,
                runs: 10000,
            },
        },
    },
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
    wethAddress: {
        Mainnet: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        Arbitrum: '0x0',
        Optimism: '0x4200000000000000000000000000000000000006',
    },
};

require('./scripts/hardhat-tasks.js');
