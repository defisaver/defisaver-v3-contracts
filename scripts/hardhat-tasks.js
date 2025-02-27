/* eslint-disable no-undef */

const {
    flatten,
    verifyContract,
    deployContract,
    sleep,
    findPathByContractName,
    encryptPrivateKey,
    changeNetworkNameForAddresses,
} = require('./hardhat-tasks-functions');

const {
    createFork, topUp,
} = require('./utils/fork');

task('fladepver', 'Deploys and verifies contract on etherscan')
    .addOptionalPositionalParam('contractName', 'The name of the contract to flatten, deploy and verify')
    .addOptionalPositionalParam('gas', 'The price (in gwei) per unit of gas')
    .addOptionalPositionalParam('nonce', 'The nonce to use in the transaction')
    .setAction(async (args) => {
        await flatten(await findPathByContractName(args.contractName));
        const contractAddress = await deployContract(args.contractName, args);
        await sleep(30000);
        await verifyContract(contractAddress, args.contractName);
    });

task('customVerify', 'Verifies a contract on etherscan')
    .addOptionalPositionalParam('contractAddress', 'Address where the contract is deployed')
    .addOptionalPositionalParam('contractName', 'Name of the contract to verify')
    .setAction(async (args) => {
        await verifyContract(args.contractAddress, args.contractName);
    });

task('customFlatten', 'Flattens for our DFS team')
    .addOptionalPositionalParam('contractName', 'The contract to flatten')
    .setAction(async (args) => {
        await flatten(await findPathByContractName(args.contractName));
    });

task('changeRepoNetwork', 'Changes addresses in helper files')
    .addOptionalPositionalParam('oldNetworkName', 'Name of the network that replaces old')
    .addOptionalPositionalParam('newNetworkName', 'Name of the network that replaces old')
    .setAction(async (args) => {
        await changeNetworkNameForAddresses(args.oldNetworkName, args.newNetworkName);
    });

task('encryptPrivateKey', 'Encrypt private key')
    .setAction(async () => {
        encryptPrivateKey();
    });
