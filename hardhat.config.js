/* eslint-disable import/no-extraneous-dependencies */
require('dotenv-safe').config();
require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-etherscan');
require('@tenderly/hardhat-tenderly');
require('@nomiclabs/hardhat-ethers');
// require("hardhat-gas-reporter");
require('hardhat-log-remover');

const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const axios = require('axios');

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
        compilers: [
            {
                version: '0.8.4',
            },
            {
                version: '0.7.6',
            },
        ],
    },
    settings: {
        optimizer: {
            enabled: true,
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
    const network = (await hre.ethers.provider.getNetwork()).name;
    const flattenedFile = (
        await fs.readFileSync(`contracts/flattened/${contractName}.sol`)
    ).toString();
    console.log('verifying');
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
    // TODO: auto select compilerversions
    params.append('compilerversion', 'v0.7.6+commit.7338295f');
    params.append('optimizationUsed', 0);
    params.append('runs', 200);
    /// @notice : MIT license
    params.append('licenseType', 3);

    let url;
    switch (network) {
    case 'mainnet':
        url = 'https://api.etherscan.io/api';
        break;
    case 'kovan':
        url = 'https://api-kovan.etherscan.io/api';
        break;
    case 'ropsten':
        url = 'https://api-ropsten.etherscan.io/api';
        break;
    case 'rinkeby':
        url = 'https://api-rinkeby.etherscan.io/api';
        break;
    case 'goerli':
        url = 'https://api-goerli.etherscan.io/api';
        break;
    default:
    }
    const tx = await axios.post(url, params, config);
    console.log(tx.data);
}

// eslint-disable-next-line no-undef
task('customFlatten', 'Flattens for our DFS team')
    .addOptionalPositionalParam('filePath', 'The file to flatten')
    .setAction(async (args) => {
        const filePath = args.filePath;

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
        let data = await execShellCommand(`npx hardhat flatten ${filePath}`);
        data = data.replace(pragmaRegex, '');
        data = data.replace(licenseRegex, '');

        const dir = './contracts/flattened';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        const flags = { flag: 'a+' };
        fs.writeFileSync(`contracts/flattened/${fileName}`, globalLicense[0]);
        fs.writeFileSync(`contracts/flattened/${fileName}`, '\n', flags);
        pragma.forEach((element) => {
            fs.writeFileSync(`contracts/flattened/${fileName}`, element, flags);
            fs.writeFileSync(`contracts/flattened/${fileName}`, '\n', flags);
        });
        fs.writeFileSync(`contracts/flattened/${fileName}`, data, flags);
    });

// eslint-disable-next-line no-undef
task('fladepver', 'Deploys and verifies contract on etherscan')
    .addOptionalPositionalParam('filePath', 'The file to flatten')
    .addOptionalPositionalParam('gas', 'The file to flatten')
    .setAction(async (args) => {
        await execShellCommand(`npx hardhat customFlatten ${args.filePath}`);
        await execShellCommand('npx hardhat compile');
        console.log(args.filePath);
        console.log(args.gas);
        const contractName = path.basename(args.filePath, '.sol');
        // DEPLOY AND VERIFY
        const contractAddress = await deployContract(contractName, args.gas);
        await sleep(30000);
        await verifyContract(contractAddress, contractName);
    });
