/* eslint-disable import/no-extraneous-dependencies */
require('dotenv-safe').config();

require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-etherscan');
require('@tenderly/hardhat-tenderly');
require('@nomiclabs/hardhat-ethers');
// require("hardhat-gas-reporter");
require('hardhat-log-remover');
require('solidity-coverage');

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    networks: {
        local: {
            url: 'http://127.0.0.1:8545',
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
    },
    solidity: {
        compilers: [
            {
                version: '0.7.6',
            },
            {
                version: '0.8.4',
            },
        ],
    },
    settings: {
        optimizer: {
            enabled: false,
            runs: 1000,
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
};
