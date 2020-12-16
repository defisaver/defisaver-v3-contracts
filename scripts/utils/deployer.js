const bre = require("hardhat");
const ethers = require("ethers");
const dotenv = require('dotenv').config();
const { write } = require('./writer');

const getGasPrice = async (exGasPrice) => {
	let defaultGasPrice = 10000000000;
	let newGasPrice = defaultGasPrice;

	if (exGasPrice.gt("0")) {
		newGasPrice = exGasPrice.add(exGasPrice.div("8"));
	} else {
		if (bre.network.name == 'mainnet') {
			defaultGasPrice = ethers.BigNumber.from(bre.network.config.gasPrice);
			newGasPrice = defaultGasPrice.gt("0") ? defaultGasPrice : await provider.getGasPrice();
		}
	}

	if (exGasPrice.gte(newGasPrice)) {
		newGasPrice = exGasPrice.add("1");
	}

	return newGasPrice;
}

const deploy = async (contractName, signer, action, gasPrice, nonce, ...args) => {

	try {
		console.log('-------------------------------------------------------------');

		const Contract = await bre.ethers.getContractFactory(contractName, signer);
		const provider = await bre.ethers.provider;

		let options = {gasPrice, nonce};

		if (nonce === -1) {
			options = { gasPrice };
		}

		let contract;
		if (args.length == 0) {
			contract = await Contract.deploy(options);
		} else {
			contract = await Contract.deploy(...args, options);
		}

	  	console.log(`${action} ${contractName}: ${contract.deployTransaction.hash}`);
	  	console.log(`Gas price: ${parseInt(gasPrice.toString())/1e9}`);
	  	
	  	await contract.deployed();
	  	const tx = await contract.deployTransaction.wait(1);

	  	console.log(`Gas used: ${tx.gasUsed}`);
	  	console.log(`${contractName} deployed to:`, contract.address);
	  	console.log(`Mainnet link: https://etherscan.io/address/${contract.address}`);

	  	await write(contractName, bre.network.name, contract.address, ...args);
	  	console.log('-------------------------------------------------------------');
	  	return contract;
	} catch (e) {
		console.log(e);
		return null;
	}	
}

const deployWithResend = (contractName, signer, action, exGasPrice, nonce, ...args) => new Promise((resolve) => {
	getGasPrice(exGasPrice).then((gasPrice) => {
		let deployPromise = deploy(contractName, signer, action, gasPrice, nonce, ...args);
		const timeoutId = setTimeout(() => resolve(deployWithResend(contractName, 'Resending', gasPrice, nonce, ...args)),  parseFloat(process.env.TIMEOUT_MINUTES) * 60 * 1000);
		
		deployPromise.then((contract) => {
			clearTimeout(timeoutId);

			if (contract !== null) resolve(contract);

			return;
		})
	})
})

const deployContract = async (contractName, ...args) => {
	const signers = await bre.ethers.getSigners();
	const address = await signers[0].getAddress();
	const nonce = await bre.ethers.provider.getTransactionCount(address);

	return deployWithResend(contractName, signers[0], 'Deploying', ethers.BigNumber.from("0"), nonce, ...args);
};

const deployAsOwner = async (contractName, signer, ...args) => {
	return deployWithResend(contractName, signer, 'Deploying', ethers.BigNumber.from("0"), -1, ...args);
};

module.exports = {
	deploy,
	deployWithResend,
	deployContract,
	deployAsOwner
}