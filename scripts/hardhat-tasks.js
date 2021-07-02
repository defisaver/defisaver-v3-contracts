const path = require('path');
const {
    flatten,
    verifyContract,
    deployContract,
    sleep,
} = require('./hardhat-tasks-functions');

// eslint-disable-next-line no-undef
task('fladepver', 'Deploys and verifies contract on etherscan')
    .addOptionalPositionalParam('filePath', 'The path to the file to flatten, deploy and verify')
    .addOptionalPositionalParam('gas', 'The price (in gwei) per unit of gas')
    .addOptionalPositionalParam('nonce', 'The nonce to use in the transaction')
    .setAction(async (args) => {
        await flatten(args.filePath);
        const contractName = path.basename(args.filePath, '.sol');
        const contractAddress = await deployContract(contractName, args);
        await sleep(30000);
        await verifyContract(contractAddress, contractName);
    });

// eslint-disable-next-line no-undef
task('customVerify', 'Verifies a contract on etherscan')
    .addOptionalPositionalParam('contractAddress', 'Address where the contract is deployed')
    .addOptionalPositionalParam('contractName', 'Name of the contract to verify')
    .setAction(async (args) => {
        await verifyContract(args.contractAddress, args.contractName);
    });

// eslint-disable-next-line no-undef
task('customFlatten', 'Flattens for our DFS team')
    .addOptionalPositionalParam('filePath', 'The file to flatten')
    .setAction(async (args) => {
        await flatten(args.filePath);
    });
