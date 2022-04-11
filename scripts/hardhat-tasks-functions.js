/* eslint-disable no-param-reassign */
/* eslint-disable no-undef */ // This is to disable warning for hre undefined in file
/* eslint-disable import/no-extraneous-dependencies */ // This is to disable warnings for imports
const fs = require('fs-extra');
const { exec } = require('child_process');
const axios = require('axios');
const path = require('path');
const readline = require('readline');
const readlineSync = require('readline-sync');
const hardhatSettings = require('../hardhat.config');
const { encrypt, decrypt } = require('./utils/crypto');

async function changeWethAddress(oldNetworkName, newNetworkName) {
    const TokenUtilsContract = 'contracts/utils/TokenUtils.sol';
    const tokenUtilsContract = (
        await fs.readFileSync(TokenUtilsContract)
    ).toString();

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
    return new Promise((resolve) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.warn(error);
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

async function deployContract(contractName, args) {
    const gasPriceSelected = args.gas;
    const network = hre.network.config.name;
    const prompt = await getInput(`You're deploying ${contractName} on ${network} at gas price of ${gasPriceSelected} gwei${args.nonce ? ` with nonce : ${args.nonce}` : ''}. Are you 100% sure? (Y/n)!\n`);
    if (prompt.toLowerCase() === 'n') {
        rl.close();
        console.log('You did not agree to continue with deployment');
        process.exit(1);
    }
    if (gasPriceSelected > 300) {
        gasPriceWarning = await getInput(`You used a gas price of ${gasPriceSelected} gwei. Are you 100% sure? (Y/n)!\n`);
        if (gasPriceWarning.toLowerCase() === 'n') {
            rl.close();
            console.log('You did not agree to continue with deployment');
            process.exit(1);
        }
    }
    console.log('Starting deployment process');
    await execShellCommand('npx hardhat compile');
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
            maxPriorityFeePerGas: hre.ethers.utils.parseUnits('1.1', 'gwei'),
        };
    }
    if (args.nonce) {
        overrides.nonce = parseInt(args.nonce, 10);
    }
    const useEncrypted = await getInput('Do you wish to use encrypted key from .env? (Y/n)!\n');
    let deployer;
    if (useEncrypted.toLowerCase() !== 'n') {
        const secretKey = readlineSync.question('Enter secret key for decrypting private key for deployment address!\n', {
            hideEchoBack: true, // The typed text on screen is hidden by `*` (default).
            mask: '',
        });
        const decryptedKey = decrypt(process.env.ENCRYPTED_KEY, secretKey);
        deployer = new hre.ethers.Wallet(
            decryptedKey,
            hre.ethers.provider,
        );
    } else {
        [deployer] = await hre.ethers.getSigners();
    }

    console.log('Deploying from:', deployer.address);
    console.log('Account balance:', (await deployer.getBalance()).toString());
    let Contract = await hre.ethers.getContractFactory(
        `contracts/flattened/${contractName}.sol:${contractName}`,
    );
    Contract = Contract.connect(deployer);
    const contract = await Contract.deploy(overrides);
    const blockExplorer = hre.network.config.blockExplorer;

    const networkPrefix = (network === 'mainnet' || network === 'arbitrum') ? '' : `${network}.`;

    console.log(`Transaction : https://${networkPrefix}${blockExplorer}.io/tx/${contract.deployTransaction.hash}`);

    await contract.deployed();
    console.log(`Contract deployed to: https://${networkPrefix}${blockExplorer}.io/address/${contract.address}`);

    return contract.address;
}

async function verifyContract(contractAddress, contractName) {
    const network = hre.network.config.name;
    const networkSupportsVerification = hre.network.config.contractVerification;
    if (!networkSupportsVerification) {
        return;
    }
    const flattenedFile = (
        await fs.readFileSync(`contracts/flattened/${contractName}.sol`)
    ).toString();
    console.log('Starting verification process');
    const config = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    };
    const params = new URLSearchParams();

    const apiKey = process.env.ETHERSCAN_API_KEY;

    params.append('apikey', apiKey);
    params.append('module', 'contract');
    params.append('action', 'verifysourcecode');
    params.append('contractaddress', contractAddress);
    params.append('sourceCode', flattenedFile);
    params.append('contractname', contractName);
    params.append('codeformat', 'solidity-single-file"');
    let solVersion;
    // https://etherscan.io/solcversions see supported sol versions
    switch (hardhatSettings.solidity.version) {
    case ('=0.8.10'):
        solVersion = 'v0.8.10+commit.fc410830';
        break;
    default:
        solVersion = 'v0.8.10+commit.fc410830';
    }
    params.append('compilerversion', solVersion);
    params.append('optimizationUsed', hardhatSettings.solidity.settings.optimizer.enabled ? 1 : 0);
    params.append('runs', hardhatSettings.solidity.settings.optimizer.runs);
    params.append('EVMVersion', 'default (compiler defaults)');
    /// @notice : MIT license
    params.append('licenseType', 3);

    const blockExplorer = hre.network.config.blockExplorer;
    let url = `https://api.${blockExplorer}.io/api`;
    let demo = `https://${blockExplorer}.io/sourcecode-demo.html`;
    if (!(network === 'mainnet' || network === 'arbitrum')) {
        url = `https://api-${network}.${blockExplorer}.io/api`;
        demo = `https://${network}.${blockExplorer}.io/sourcecode-demo.html`;
    }
    const tx = await axios.post(url, params, config);
    console.log(`Check how verification is going at ${demo} with API key ${apiKey} and receipt GUID ${tx.data.result}`);
}

async function flatten(filePath) {
    const dir = './contracts/flattened';
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    const fileName = path.basename(filePath);
    const pragmaRegex = /^pragma.*$\n?/gm; // anything starting with pragma
    const licenseRegex = /^[//SPDX].*$\n?/gm; // anything starting with //SPDX
    let globalLicense;
    let pragma;
    // Find license and any pragmas (sol version, and possible abi encoder)
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        globalLicense = data.match(licenseRegex);
        pragma = data.match(pragmaRegex);
    } catch (err) {
        console.error(err);
    }
    // Flatten file, delete unneeded licenses and pragmas
    await execShellCommand(`npx hardhat flatten ${filePath} > contracts/flattened/${fileName}`);
    let data = (
        await fs.readFileSync(`contracts/flattened/${fileName}`)
    ).toString();
    data = data.replace(pragmaRegex, '');
    data = data.replace(licenseRegex, '');
    const flags = { flag: 'a+' };

    fs.writeFileSync(`contracts/flattened/${fileName}`, globalLicense[0]);
    fs.writeFileSync(`contracts/flattened/${fileName}`, '\n', flags);
    pragma.forEach((element) => {
        fs.writeFileSync(`contracts/flattened/${fileName}`, element, flags);
        fs.writeFileSync(`contracts/flattened/${fileName}`, '\n', flags);
    });
    fs.writeFileSync(`contracts/flattened/${fileName}`, data, flags);
}
const getAllFiles = function (dirPath, arrayOfFiles) {
    files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach((file) => {
        if (file !== 'flattened') {
            if (fs.statSync(`${dirPath}/${file}`).isDirectory()) {
                arrayOfFiles = getAllFiles(`${dirPath}/${file}`, arrayOfFiles);
            } else {
                arrayOfFiles.push(path.join(dirPath, '/', file));
            }
        }
    });

    return arrayOfFiles;
};

async function findPathByContractName(contractName) {
    console.log(contractName);
    files = getAllFiles('./contracts');
    let foundPath = '';
    files.forEach((file) => {
        if (contractName === path.basename(file, '.sol')) {
            foundPath = file;
        }
    });
    return foundPath;
}

async function encryptPrivateKey() {
    const privateKey = readlineSync.question('Enter wallet private key!\n', {
        hideEchoBack: true, // The typed text on screen is hidden by `*` (default).
        mask: '',
    });
    const secretKey = readlineSync.question('Enter secret key for decrypting private key for deployment address!\n', {
        hideEchoBack: true, // The typed text on screen is hidden by `*` (default).
        mask: '',
    });
    encryptedKey = await encrypt(privateKey, secretKey);
    console.log('Encrypted key to put in .env file:');
    console.log(encryptedKey);
}

async function changeNetworkNameForAddresses(oldNetworkName, newNetworkName) {
    files = getAllFiles('./contracts');
    files.map(async (file) => {
        if (file.toString().includes('Helper.sol')) {
            const fileDir = path.dirname(file);
            const filesInSameDir = getAllFiles(fileDir);
            let rewrite = false;
            filesInSameDir.forEach((fileInSameDir) => {
                if (fileInSameDir.toString().includes(newNetworkName)) {
                    rewrite = true;
                }
            });
            if (rewrite) {
                console.log(file);
                const contractContent = (
                    await fs.readFileSync(file.toString())
                ).toString();
                fs.writeFileSync(file, contractContent.replaceAll(oldNetworkName, newNetworkName));
            }
        }
    });
    changeWethAddress(oldNetworkName, newNetworkName);
    console.log('Wait for the compilation to end');
    await execShellCommand('npx hardhat compile');
}

module.exports = {
    flatten,
    verifyContract,
    deployContract,
    sleep,
    findPathByContractName,
    encryptPrivateKey,
    changeNetworkNameForAddresses,
    execShellCommand,
};
