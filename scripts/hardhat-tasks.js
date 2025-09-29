/* eslint-disable no-undef */
const { execSync } = require('child_process');

const {
    flatten,
    verifyContract,
    deployContract,
    findPathByContractName,
    encryptPrivateKey,
} = require('./hardhat-tasks-functions');

task('fladepver', 'Deploys and verifies contract(s) on etherscan')
    .addPositionalParam('gas', 'The price (in gwei) per unit of gas')
    .addVariadicPositionalParam('contractNames', 'The names of the contracts to flatten, deploy and verify', [], types.string)
    .addFlag('nonce', 'Use this flag to specify nonce: --nonce NUMBER')
    .setAction(async (args) => {
        const newArgs = { ...args };
        const contracts = args.contractNames;

        if (contracts.length === 0) {
            throw new Error('At least one contract name is required. Usage: npx hardhat fladepver GAS_PRICE Contract1 Contract2 ... [--nonce NUMBER]');
        }

        // Fla - Flatten
        await Promise.all(contracts.map(async (contractName) => {
            const path = await findPathByContractName(contractName);
            await flatten(path);
        }));

        // Dep - Deploy
        const deployedAddresses = await deployContract(contracts, newArgs);

        // Ver - Verify
        console.log('\nStarting contract verification...');
        const verificationPromises = Object.entries(deployedAddresses)
            .map(async ([contractName, contractAddress]) => {
                try {
                    await verifyContract(contractAddress, contractName);
                    console.log(`✓ ${contractName} verified successfully`);
                } catch (error) {
                    console.log(`✗ Failed to verify ${contractName}: ${error.message}`);
                }
            });
        await Promise.all(verificationPromises);
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

task('encryptPrivateKey', 'Encrypt private key')
    .setAction(async () => {
        encryptPrivateKey();
    });

task('deployOnFork', 'Deploys contracts on an existing fork')
    .addVariadicPositionalParam('contractNames', 'The names of the contracts to deploy', [], types.string)
    .setAction(async (args) => {
        const contractNames = args.contractNames.join(' ');
        const cmd = `CONTRACTS="${contractNames}" npx hardhat run ./scripts/utils/deploy-on-fork.js --network fork`;
        try {
            execSync(cmd, { stdio: 'inherit', shell: true });
        } catch (error) {
            console.error(`Command failed: ${error}`);
            process.exit(1);
        }
    });
