#!/usr/bin/env node
/* eslint-disable import/no-extraneous-dependencies */
const fs = require('fs-extra');
const { exec } = require('child_process');
const path = require('path');
const { chainIds } = require('../test/utils/utils');
const hardhatSettings = require('../hardhat.config');

if (process.argv.length !== 4) {
    console.error('Usage: change-repo-network <oldNetwork> <newNetwork>');
    process.exit(1);
}

const [oldNetworkName, newNetworkName] = process.argv.slice(2);

async function execShellCommand(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.warn(error);
                reject(error);
                return;
            }
            resolve(stdout || stderr);
        });
    });
}

function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);
    files.forEach((file) => {
        if (file !== 'flattened') {
            const fullPath = `${dirPath}/${file}`;
            if (fs.statSync(fullPath).isDirectory()) {
                getAllFiles(fullPath, arrayOfFiles);
            } else {
                arrayOfFiles.push(fullPath);
            }
        }
    });
    return arrayOfFiles;
}

async function changeWethAddress(oldNetwork, newNetwork) {
    const TokenUtilsContract = 'contracts/utils/TokenUtils.sol';
    const tokenUtilsContract = (
        await fs.readFileSync(TokenUtilsContract)
    ).toString();

    fs.writeFileSync(
        TokenUtilsContract,
        tokenUtilsContract.replaceAll(
            hardhatSettings.wethAddress[oldNetwork],
            hardhatSettings.wethAddress[newNetwork],
        ),
    );
}

async function changeHardhatConfig(oldNetwork, newNetwork) {
    const configPath = 'hardhat.config.js';
    const configContent = (await fs.readFileSync(configPath)).toString();

    const networkName = newNetwork.toLowerCase();
    if (!chainIds[networkName]) throw new Error(`Network ${newNetwork} not supported`);

    const newConfig = {
        chainId: chainIds[networkName],
        nodeEnv: networkName === 'mainnet' ? 'ETHEREUM_NODE' : `${newNetwork.toUpperCase()}_NODE`,
        evmVersion: networkName === 'linea' ? 'london' : 'cancun',
    };

    // Update only the forking url in hardhat config
    let updatedContent = configContent.replace(
        /(forking:\s*{\s*url:\s*)process\.env\.[A-Z_]+_NODE/,
        `$1process.env.${newConfig.nodeEnv}`,
    );

    // Update the network name and chainId only in the hardhat section
    updatedContent = updatedContent.replace(
        /(hardhat:\s*{[\s\S]*?name:\s*['"]).*?(['"])/,
        `$1${networkName}$2`,
    );

    updatedContent = updatedContent.replace(
        /(hardhat:\s*{[\s\S]*?chainId:\s*)\d+/,
        `$1${newConfig.chainId}`,
    );

    if (oldNetwork === 'Linea' || newNetwork === 'Linea') {
        updatedContent = updatedContent.replace(
            /evmVersion:\s*['"].*?['"]/,
            `evmVersion: '${newConfig.evmVersion}'`,
        );
    }

    fs.writeFileSync(configPath, updatedContent);
}

async function changeNetworkNameForAddresses(oldNetwork, newNetwork) {
    const files = getAllFiles('./contracts');
    await Promise.all(files.map(async (file) => {
        const helperRegex = 'Helper(.*)sol';
        if (file.toString().match(helperRegex)) {
            const fileDir = path.dirname(file);
            const filesInSameDir = getAllFiles(fileDir);
            let rewrite = false;
            filesInSameDir.forEach((fileInSameDir) => {
                if (fileInSameDir.toString().includes(newNetwork)) {
                    rewrite = true;
                }
            });
            if (rewrite) {
                console.log(file);
                const contractContent = (
                    await fs.readFileSync(file.toString())
                ).toString();
                fs.writeFileSync(file, contractContent.replaceAll(oldNetwork, newNetwork));
            }
        }
    }));
}

async function excludeCancunSpecificChanges(oldNetwork, newNetwork) {
    const targetFiles = [
        'contracts/actions/checkers/CompV3RatioCheck.sol',
        'contracts/triggers/CompV3PriceTrigger.sol',
        'contracts/triggers/CompV3RatioTrigger.sol',
    ];

    if (newNetwork === 'Linea') {
        const files = getAllFiles('./contracts');
        await Promise.all(files.map(async (file) => {
            const content = (await fs.readFileSync(file)).toString();
            let updatedContent = content
                .replace(/tload\(/g, 'sload(')
                .replace(/tstore\(/g, 'sstore(');

            if (targetFiles.some((target) => file.includes(target))) {
                updatedContent = updatedContent
                    .replace(/TransientStorageCancun/g, 'TransientStorage')
                    .replace(/TRANSIENT_STORAGE_CANCUN/g, 'TRANSIENT_STORAGE');
            }

            if (updatedContent !== content) {
                console.log(`Updating ${file}`);
                fs.writeFileSync(file, updatedContent);
            }
        }));
    } else if (oldNetwork === 'Linea') {
        const files = getAllFiles('./contracts');
        await Promise.all(files.map(async (file) => {
            const content = (await fs.readFileSync(file)).toString();
            let updatedContent = content
                .replace(/sload\(/g, 'tload(')
                .replace(/sstore\(/g, 'tstore(');

            if (targetFiles.some((target) => file.includes(target))) {
                updatedContent = updatedContent
                    .replace(/TransientStorage/g, 'TransientStorageCancun')
                    .replace(/TRANSIENT_STORAGE/g, 'TRANSIENT_STORAGE_CANCUN');
            }

            if (updatedContent !== content) {
                console.log(`Updating ${file}`);
                fs.writeFileSync(file, updatedContent);
            }
        }));
    }
}

async function main() {
    try {
        console.log(`Changing repo network from ${oldNetworkName} to ${newNetworkName}...`);
        await changeNetworkNameForAddresses(oldNetworkName, newNetworkName);
        console.log('✓ Updated network names in contract files');
        await changeWethAddress(oldNetworkName, newNetworkName);
        console.log('✓ Updated WETH addresses');
        await changeHardhatConfig(oldNetworkName, newNetworkName);
        console.log('✓ Updated hardhat config');
        await excludeCancunSpecificChanges(oldNetworkName, newNetworkName);
        console.log('✓ Excluded Cancun-specific changes');
        console.log('Compiling contracts...');
        await execShellCommand('npx hardhat compile');
        console.log('✓ Compilation complete');
        console.log('All done! 🎉');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
