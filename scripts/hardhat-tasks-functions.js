/* eslint-disable no-undef */ // This is to disable warning for hre undefined in file
/* eslint-disable import/no-extraneous-dependencies */ // This is to disable warnings for imports
const fs = require('fs-extra');
const { exec } = require('child_process');
const axios = require('axios');
const path = require('path');
const readline = require('readline');

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
const hardhatImport = import('../hardhat.config.js');

function execShellCommand(cmd) {
    return new Promise((resolve) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.warn(error);
            }
            resolve(stdout || stderr);
        });
    });
}
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
async function deployContract(contractName, gasPriceSelected) {
    const network = (await hre.ethers.provider.getNetwork()).name;
    const prompt = await getInput(`You're deploying ${contractName} on ${network} at gas price of ${gasPriceSelected} gwei. Type YES to continue!\n`);
    if (prompt.toLowerCase() !== 'yes') {
        rl.close();
        console.log('You did not agree to continue with deployment');
        process.exit(1);
    }
    if (gasPriceSelected > 300) {
        gasPriceWarning = await getInput(`You used a gas price of ${gasPriceSelected} gwei. Are you 100% sure? Type YES to continue!\n`);
        if (gasPriceWarning.toLowerCase() !== 'yes') {
            rl.close();
            console.log('You did not agree to continue with deployment');
            process.exit(1);
        }
    }
    console.log('Starting deployment process');
    await execShellCommand('npx hardhat compile');
    const overrides = {
        // The price (in wei) per unit of gas
        gasPrice: hre.ethers.utils.parseUnits(gasPriceSelected, 'gwei'),
    };
    const [deployer] = await hre.ethers.getSigners();
    console.log('Deploying contracts with the account:', deployer.address);

    console.log('Account balance:', (await deployer.getBalance()).toString());
    const Contract = await hre.ethers.getContractFactory(
        `contracts/flattened/${contractName}.sol:${contractName}`,
    );
    const contract = await Contract.deploy(overrides);
    await contract.deployed();
    console.log('Contract deployed to:', contract.address);
    return contract.address;
}

async function verifyContract(contractAddress, contractName) {
    const hardhatSettings = (await hardhatImport).default;
    const network = (await hre.ethers.provider.getNetwork()).name;
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
    params.append('apikey', process.env.ETHERSCAN_API_KEY);
    params.append('module', 'contract');
    params.append('action', 'verifysourcecode');
    params.append('contractaddress', contractAddress);
    params.append('sourceCode', flattenedFile);
    params.append('contractname', contractName);
    params.append('codeformat', 'solidity-single-file"');
    let solVersion;
    switch (hardhatSettings.solidity.version) {
    case ('0.7.6'):
        solVersion = 'v0.7.6+commit.7338295f';
        break;
    case ('0.8.4'):
        solVersion = 'v0.8.4+commit.c7e474f2';
        break;
    default:
        solVersion = 'v0.7.6+commit.7338295f';
    }
    params.append('compilerversion', solVersion);
    params.append('optimizationUsed', hardhatSettings.solidity.settings.optimizer.enabled ? 1 : 0);
    params.append('runs', hardhatSettings.solidity.settings.optimizer.runs);
    /// @notice : MIT license
    params.append('licenseType', 3);

    let url = 'https://api.etherscan.io/api';
    if (network !== 'mainnet') {
        url = `https://api-${network}.etherscan.io/api`;
    }
    const tx = await axios.post(url, params, config);
    console.log(tx.data);
    console.log(`https://${network === 'mainnet' ? '' : `${network}.`}etherscan.io/address/${contractAddress}`);
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
module.exports = {
    flatten,
    verifyContract,
    deployContract,
    sleep,
};
