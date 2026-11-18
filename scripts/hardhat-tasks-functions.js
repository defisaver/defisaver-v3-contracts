/* eslint-disable no-undef */ // This is to disable warning for hre undefined in file
const fs = require('fs-extra');
const { exec } = require('child_process');
const ethers = require('ethers');
const path = require('path');
const readline = require('readline');
const readlineSync = require('readline-sync');
const hardhatSettings = require('../hardhat.config');
const { encrypt, decrypt } = require('./utils/crypto');
const { verifySource } = require('./deployment/verify');

function findAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
        if (file !== 'flattened') {
            const fullPath = path.join(dirPath, file);
            if (fs.statSync(fullPath).isDirectory()) {
                findAllFiles(fullPath, arrayOfFiles);
            } else {
                arrayOfFiles.push(fullPath);
            }
        }
    });

    return arrayOfFiles;
}

async function updateContractsAddressesInJsonFiles(deployedAddresses, contracts, network) {
    const allFiles = findAllFiles(path.join(__dirname, '..', 'contracts'));
    const contractPaths = {};
    contracts.forEach((contractName) => {
        const originalPath = allFiles.find((file) => {
            const fileName = path.basename(file, '.sol');
            return fileName === contractName && !file.includes('flattened');
        });
        if (originalPath) {
            contractPaths[contractName] = path.relative(path.join(__dirname, '..'), originalPath);
        }
    });

    const networkLowercase = network.toLowerCase();
    const addressesFilePath = path.join(__dirname, '..', 'addresses', `${networkLowercase}.json`);
    const addressesDir = path.join(__dirname, '..', 'addresses');
    if (!fs.existsSync(addressesDir)) {
        fs.mkdirSync(addressesDir);
    }

    let addresses = [];
    if (fs.existsSync(addressesFilePath)) {
        try {
            const fileContent = await fs.readFile(addressesFilePath, 'utf8');
            // Clean up any trailing commas or malformed JSON
            const cleanContent = fileContent.replace(/,(\s*[\]}])/g, '$1');
            addresses = JSON.parse(cleanContent);
            if (!Array.isArray(addresses)) {
                console.log(
                    `Warning: ${networkLowercase}.json does not contain an array, resetting file`,
                );
                addresses = [];
            }
        } catch (error) {
            console.log(
                `Warning: Error parsing ${networkLowercase}.json, resetting file:`,
                error.message,
            );
            addresses = [];
        }
    }

    console.log('\nUpdating contract entries:');
    Object.entries(deployedAddresses).forEach(([contractName, newAddress]) => {
        try {
            const contractPath =
                contractPaths[contractName] || `contracts/flattened/${contractName}.sol`;
            const isAction = contractPath.includes('actions');
            const inRegistry = isAction;
            const changeTime = inRegistry ? '86400' : 0;

            const existingEntryIndex = addresses.findIndex((entry) => entry.name === contractName);

            if (existingEntryIndex !== -1) {
                // Update existing entry
                const entry = addresses[existingEntryIndex];
                const currentVersion = entry.version;
                const versionParts = currentVersion.split('.');
                versionParts[2] = (parseInt(versionParts[2], 10) + 1).toString();
                const newVersion = versionParts.join('.');

                const history = entry.history || [];
                if (entry.address && entry.address !== newAddress) {
                    history.unshift(entry.address);
                }

                addresses[existingEntryIndex] = {
                    ...entry,
                    address: newAddress,
                    version: newVersion,
                    history,
                };

                console.log(`\n${contractName}:`);
                console.log('  - New address:', newAddress);
                console.log('  - Old address moved to history:', entry.address);
                console.log('  - New version:', newVersion);
            } else {
                // Create new entry
                const newEntry = {
                    name: contractName,
                    address: newAddress,
                    id: ethers.utils.id(contractName).slice(0, 10),
                    path: contractPath,
                    version: '1.0.0',
                    inRegistry,
                    changeTime,
                    registryIds: [],
                    history: [],
                };
                addresses.push(newEntry);

                console.log(`\n${contractName}:`);
                console.log('  - Created new entry with address:', newAddress);
            }
        } catch (error) {
            console.log(`⚠️  Warning: Failed to process ${contractName}:`, error.message);
        }
    });

    // Write all changes at once
    try {
        let jsonString = JSON.stringify(addresses, null, 4);
        // Format single-item history arrays inline
        jsonString = jsonString.replace(
            /"history":\s*\[\s*\n\s*("[^"]*")\s*\n\s*\]/g,
            '"history": [$1]',
        );
        await fs.writeFile(addressesFilePath, jsonString);
        console.log(`\n✓ Successfully updated ${networkLowercase}.json with all changes`);
    } catch (error) {
        console.log(`\n❌ Error writing to ${networkLowercase}.json:`, error.message);
    }
}

async function changeWethAddress(oldNetworkName, newNetworkName) {
    const TokenUtilsContract = 'contracts/utils/token/TokenUtils.sol';
    const tokenUtilsContract = (await fs.readFileSync(TokenUtilsContract)).toString();

    fs.writeFileSync(
        TokenUtilsContract,
        tokenUtilsContract.replaceAll(
            hardhatSettings.wethAddress[oldNetworkName],
            hardhatSettings.wethAddress[newNetworkName],
        ),
    );
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function getInput(text) {
    return new Promise((resolve) => {
        rl.question(`${text}`, (input) => {
            resolve(input);
        });
    });
}

function execShellCommand(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            console.log(stderr);
            resolve(stdout || stderr);
        });
    });
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function deployContract(contractNames, args) {
    const gasPriceSelected = args.gas;
    const network = hre.network.config.name;
    const networkName = network === 'optimistic' ? 'optimism' : network;

    const contracts = Array.isArray(contractNames) ? contractNames : [contractNames];

    console.log('\nPreparing to deploy the following contracts:');
    contracts.forEach((name, i) => console.log(`${i + 1}. ${name}`));
    console.log();

    /* //////////////////////////////////////////////////////////////
                            AGREE_TO_DEPLOY
    ////////////////////////////////////////////////////////////// */
    const nonceInfo = args.nonce !== undefined ? ` with nonce: ${args.nonce}` : '';
    const prompt = await getInput(
        `You're deploying ${contracts.length} contract(s) on ${network} at gas price of ${gasPriceSelected} gwei${nonceInfo}.\nAre you 100% sure? (Y/n)!\n`,
    );
    if (prompt.toLowerCase() === 'n') {
        rl.close();
        console.log('You did not agree to continue with deployment');
        process.exit(1);
    }

    /* //////////////////////////////////////////////////////////////
                            CHECK_GAS_PRICE
    ////////////////////////////////////////////////////////////// */
    if (gasPriceSelected > 300) {
        const gasPriceWarning = await getInput(
            `You used a gas price of ${gasPriceSelected} gwei. This is quite high! Are you 100% sure? (Y/n)!\n`,
        );
        if (gasPriceWarning.toLowerCase() === 'n') {
            rl.close();
            console.log('You did not agree to continue with deployment');
            process.exit(1);
        }
    }

    console.log('Starting deployment process');
    await hre.run('compile');

    /* //////////////////////////////////////////////////////////////
                          SET_DEPLOY_CONFIG
    ////////////////////////////////////////////////////////////// */
    const txType = hre.network.config.txType;
    let overrides;
    if (txType === 0) {
        overrides = {
            // The price (in wei) per unit of gas
            gasPrice: hre.ethers.utils.parseUnits(gasPriceSelected, 'gwei'),
        };
    } else if (txType === 2) {
        overrides = {
            // The price (in wei) per unit of gas
            maxFeePerGas: hre.ethers.utils.parseUnits(gasPriceSelected, 'gwei'),
            maxPriorityFeePerGas: hre.ethers.utils.parseUnits('0.05', 'gwei'),
        };
    }
    if (args.nonce !== undefined) {
        overrides.nonce = parseInt(args.nonce, 10);
    }

    /* //////////////////////////////////////////////////////////////
                        CHECK_NETWORK_ADDRESSES
    ////////////////////////////////////////////////////////////// */
    await Promise.all(
        contracts.map(async (contractName) => {
            const contractPath = `contracts/flattened/${contractName}.sol`;
            const contractString = await fs
                .readFileSync(`${__dirname}/../${contractPath}`)
                .toString('utf-8');

            // Check for correct network addresses
            const helperRegex = /contract (.*)Addresses/g;
            const addressesUsed = contractString.match(helperRegex);

            if (addressesUsed) {
                const invalidAddresses = addressesUsed.filter(
                    (addressContract) =>
                        !addressContract.toLowerCase().includes(networkName.toLowerCase()) &&
                        !/\bUtilAddresses\b/.test(addressContract),
                );
                if (invalidAddresses.length > 0) {
                    console.log(`ERROR! Check if addresses are matching in ${contractName}!`);
                    console.log('Found:', invalidAddresses[0]);
                    console.log('Expected network:', networkName);
                    process.exit(1);
                }
            }
        }),
    );

    /* //////////////////////////////////////////////////////////////
                            SET_UP_DEPLOYER
    ////////////////////////////////////////////////////////////// */
    // Get deployer wallet - only need to do this once for all contracts
    const useEncrypted = await getInput('Do you wish to use encrypted key from .env? (Y/n)!\n');
    let deployer;
    if (useEncrypted.toLowerCase() !== 'n') {
        const secretKey = readlineSync.question(
            'Enter secret key for decrypting private key for deployment address!\n',
            {
                hideEchoBack: true,
                mask: '',
            },
        );

        let encryptedKey = process.env.ENCRYPTED_KEY;
        if (network !== 'mainnet') {
            encryptedKey = process.env[`ENCRYPTED_KEY_${network.toUpperCase()}`];
        }

        const decryptedKey = decrypt(encryptedKey, secretKey);
        deployer = new hre.ethers.Wallet(decryptedKey, hre.ethers.provider);
    } else {
        [deployer] = await hre.ethers.getSigners();
    }

    /* //////////////////////////////////////////////////////////////
                             DEPLOY !!!
    ////////////////////////////////////////////////////////////// */
    console.log('\nDeploying from:', deployer.address);
    console.log('Account balance:', (await deployer.getBalance()).toString());

    // Deploy contracts sequentially to maintain nonce order
    const deployedAddresses = {};
    let currentNonce =
        args.nonce !== undefined
            ? parseInt(args.nonce, 10)
            : await deployer.getTransactionCount('pending');

    await contracts.reduce(async (promise, contractName) => {
        await promise;
        console.log(`\nDeploying ${contractName}...`);
        const contractPath = `contracts/flattened/${contractName}.sol`;

        const currentOverrides = { ...overrides, nonce: currentNonce++ };

        const Contract = await hre.ethers.getContractFactory(`${contractPath}:${contractName}`);
        const deployerContract = Contract.connect(deployer);
        const contract = await deployerContract.deploy(currentOverrides);

        const txUrl = `https://${hre.network.config.blockExplorer}/tx/${contract.deployTransaction.hash}`;
        const addressUrl = `https://${hre.network.config.blockExplorer}/address/`;
        console.log(`Transaction: ${txUrl}`);

        await contract.deployed();
        deployedAddresses[contractName] = contract.address;
        console.log(`${contractName} deployed to: ${addressUrl}${contract.address}`);
    }, Promise.resolve());

    /* //////////////////////////////////////////////////////////////
                        SHOW_DEPLOYMENT_SUMMARY
    ////////////////////////////////////////////////////////////// */
    console.log('\n=== Deployment Summary ===');
    console.log(`${'Contract Name'.padEnd(30)}Address`);
    console.log('─'.repeat(75));
    Object.entries(deployedAddresses).forEach(([name, address]) => {
        console.log(`${name.padEnd(30)}${address}`);
    });
    console.log('─'.repeat(75));

    /* //////////////////////////////////////////////////////////////
                        UPDATE_ADDRESSES_FILES
    ////////////////////////////////////////////////////////////// */
    console.log('\nUpdating addresses files...');
    await updateContractsAddressesInJsonFiles(deployedAddresses, contracts, networkName);

    return deployedAddresses;
}

async function verifyContract(contractAddress, contractName) {
    if (!hre.network.config.contractVerification) return;
    const sourceName = `contracts/flattened/${contractName}.sol`;
    const info = await hre.artifacts.getBuildInfo(`${sourceName}:${contractName}`);
    if (!info)
        throw new Error(`Missing build info for ${contractName}; restore the deployment artifacts`);
    const { chainId } = await hre.ethers.provider.getNetwork();
    await verifySource({
        chainId,
        address: contractAddress,
        sourceName,
        name: contractName,
        input: info.input,
        solcLongVersion: info.solcLongVersion,
        apiKey: process.env.ETHERSCAN_API_KEY,
        onGuid: (guid) => {
            if (guid) console.log(`Verification submitted with GUID: ${guid}`);
        },
    });
}

async function flatten(filePath) {
    const dir = './contracts/flattened';
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    const fileName = path.basename(filePath);
    const pragmaRegex = /^pragma.*$\n?/gm; // anything starting with pragma
    const topLvlCommentsRegex = /^(?<!\/\*\*)(?<=^|\n)[^\s]*\/\/.*$/gm; // matches anything with // that is without spaces or indents
    let globalLicense;
    let pragma;
    // Find license and any pragmas (sol version, and possible abi encoder)
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        globalLicense = data.match(topLvlCommentsRegex);
        pragma = data.match(pragmaRegex);
    } catch (err) {
        console.error(err);
    }
    // Flatten file, delete unneeded licenses and pragmas
    await execShellCommand(`npx hardhat flatten ${filePath} > contracts/flattened/${fileName}`);
    let data = (await fs.readFileSync(`contracts/flattened/${fileName}`)).toString();
    data = data.replace(pragmaRegex, '');
    data = data.replace(topLvlCommentsRegex, '');
    const flags = { flag: 'a+' };

    fs.writeFileSync(`contracts/flattened/${fileName}`, globalLicense[0]);
    fs.writeFileSync(`contracts/flattened/${fileName}`, '\n', flags);
    pragma.forEach((element) => {
        fs.writeFileSync(`contracts/flattened/${fileName}`, element, flags);
        fs.writeFileSync(`contracts/flattened/${fileName}`, '\n', flags);
    });
    fs.writeFileSync(`contracts/flattened/${fileName}`, data, flags);
}

async function findPathByContractName(contractName) {
    const files = findAllFiles('./contracts');
    let foundPath = '';

    files.forEach((file) => {
        if (contractName === path.basename(file, '.sol')) {
            foundPath = file;
        }
    });

    if (!foundPath) {
        throw new Error(`Contract ${contractName} not found in the contracts directory`);
    }

    return foundPath;
}

async function encryptPrivateKey() {
    const privateKey = readlineSync.question('Enter wallet private key!\n', {
        hideEchoBack: true, // The typed text on screen is hidden by `*` (default).
        mask: '',
    });
    const secretKey = readlineSync.question(
        'Enter secret key for decrypting private key for deployment address!\n',
        {
            hideEchoBack: true, // The typed text on screen is hidden by `*` (default).
            mask: '',
        },
    );
    encryptedKey = await encrypt(privateKey, secretKey);
    console.log('Encrypted key to put in .env file:');
    console.log(encryptedKey);
}

module.exports = {
    flatten,
    verifyContract,
    deployContract,
    findAllFiles,
    sleep,
    findPathByContractName,
    encryptPrivateKey,
    execShellCommand,
    changeWethAddress,
};
