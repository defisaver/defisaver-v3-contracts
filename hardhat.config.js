/* eslint-disable import/no-extraneous-dependencies */
require('dotenv-safe').config();
require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-etherscan');
require('@tenderly/hardhat-tenderly');
require('@nomiclabs/hardhat-ethers');
require('@tenderly/hardhat-tenderly');
// require("hardhat-gas-reporter");
require('hardhat-log-remover');

const Dec = require('decimal.js');

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

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    saveOnTenderly: false,
    lightTesting: true,
    networks: {
        local: {
            url: 'http://127.0.0.1:8545',
            timeout: 10000000,
        },
        fork: {
            url: `https://rpc.tenderly.co/fork/${process.env.FORK_ID}`,
            timeout: 1000000,
        },
        hardhat: {
            forking: {
                url: process.env.ETHEREUM_NODE,
                timeout: 1000000,
                // blockNumber: 12068716
            },
        },
        mainnet: {
            url: process.env.ETHEREUM_NODE,
            accounts: [process.env.PRIV_KEY_MAINNET],
            gasPrice: 40000000000,
            timeout: 10000000,
        },
        kovan: {
            url: process.env.KOVAN_ETHEREUM_NODE,
            chainId: 42,
            accounts: [process.env.PRIV_KEY_KOVAN],
        },
    },
    solidity: {
        version: '0.7.6',
        settings: {
            optimizer: {
                enabled: true,
                runs: 1000,
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
    },
};

require('./scripts/hardhat-tasks.js');
