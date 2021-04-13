/* eslint-disable global-require */
// eslint-disable-next-line import/no-extraneous-dependencies
require('dotenv-safe').config();

const fs = require('fs');
const { getFile, getCurrentDir } = require('./utils.js');

const fsPromises = fs.promises;

const DEPLOYMENTS_FOLDER_NAME = 'deployments';

const write = async (contractName, network, address, ...args) => {
    const filename = (await getFile('./artifacts/', `${contractName}.json`))[0];
    // eslint-disable-next-line import/no-dynamic-require
    const file = require(filename);

    const newFile = {
        contractName: file.contractName,
        abi: file.abi,
        networks: file.networks || {},
    };

    if (!newFile.networks[network]) {
        newFile.networks[network] = {};
    }

    if (network === 'mainnet') {
        newFile.networks[network].address = address;
        newFile.networks[network].args = args;
    }

    try {
        const currentDir = await getCurrentDir();

        fsPromises.mkdir(`${currentDir}/${DEPLOYMENTS_FOLDER_NAME}`, { recursive: true }).catch(console.error);

        const writeFilename = `${currentDir}/${DEPLOYMENTS_FOLDER_NAME}/${contractName}.json`;
        await fsPromises.writeFile(writeFilename, JSON.stringify(newFile, null, '\t'));

        return;
    } catch (e) {
        console.log(e);
    }
};

module.exports = {
    write,
    DEPLOYMENTS_FOLDER_NAME,
};
