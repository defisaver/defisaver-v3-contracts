const dotenv = require('dotenv').config();
const { getFile } = require('./utils.js');
const fs = require('fs');
const fsPromises = fs.promises;

const write = async (contractName, network, address, ...args) => {
	const filename = (await getFile(`./artifacts/`, `${contractName}.json`))[0];
	const file = require(filename);

	if (!file.networks) {
		file.networks = {};
	}

	if (!file.networks[network]) {
		file.networks[network] = {};
	}

	file.networks[network].address = address;
	file.networks[network].args = args;

	try {
		const writeFilename = filename;
		await fsPromises.writeFile(writeFilename, JSON.stringify(file, null, '\t'));
		
		return;
	} catch (e) {
		console.log(e);
		
		return;
	}
}

module.exports = {
	write
}