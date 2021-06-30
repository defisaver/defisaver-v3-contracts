/* eslint-disable import/no-extraneous-dependencies */
require('dotenv-safe').config();
require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-etherscan');
require('@tenderly/hardhat-tenderly');
require('@nomiclabs/hardhat-ethers');
// require("hardhat-gas-reporter");
require('hardhat-log-remover');
const path = require('path');
const {
    flatten,
    verifyContract,
    deployContract,
    sleep,
} = require('./scripts/helper-functions');

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    networks: {
        local: {
            url: 'http://127.0.0.1:8545',
            timeout: 1000000,
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
            url: 'https://kovan.infura.io/v3/9bf6a93bea5c42528c70099e4f8a7b4d',
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
};

// eslint-disable-next-line no-undef
task('fladepver', 'Deploys and verifies contract on etherscan')
    .addOptionalPositionalParam('filePath', 'The file to flatten')
    .addOptionalPositionalParam('gas', 'The file to flatten')
    .setAction(async (args) => {
        await flatten(args.filePath);
        const contractName = path.basename(args.filePath, '.sol');
        const contractAddress = await deployContract(contractName, args.gas);
        await sleep(30000);
        await verifyContract(contractAddress, contractName);
    });

// eslint-disable-next-line no-undef
task('customVerify', 'Verifies a contract on etherscan')
    .addOptionalPositionalParam('contractAddress', 'The file to flatten')
    .addOptionalPositionalParam('contractName', 'The file to flatten')
    .setAction(async (args) => {
        await verifyContract(args.contractAddress, args.contractName);
    });

// eslint-disable-next-line no-undef
task('customFlatten', 'Flattens for our DFS team')
    .addOptionalPositionalParam('filePath', 'The file to flatten')
    .setAction(async (args) => {
        await flatten(args.filePath);
    });
