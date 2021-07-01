const path = require('path');
const {
    flatten,
    verifyContract,
    deployContract,
    sleep,
} = require('./hardhat-tasks-functions');

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
