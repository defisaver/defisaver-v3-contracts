/* eslint-disable import/no-extraneous-dependencies */

require('dotenv-safe').config();

const hre = require('hardhat');
const ethers = require('ethers');
const { write } = require('./writer');

const getGasPrice = async (exGasPrice) => {
    let defaultGasPrice = 500000000000;
    let newGasPrice = defaultGasPrice;

    if (exGasPrice.gt('0')) {
        newGasPrice = exGasPrice.add(exGasPrice.div('8'));
    } else if (hre.network.name === 'mainnet') {
        defaultGasPrice = ethers.BigNumber.from(hre.network.config.gasPrice);
        newGasPrice = defaultGasPrice.gt('0') ? defaultGasPrice : await hre.ethers.provider.getGasPrice();
    }

    if (exGasPrice.gte(newGasPrice)) {
        newGasPrice = exGasPrice.add('1');
    }

    return newGasPrice;
};

const deploy = async (contractName, signer, action, gasPrice, nonce, ...args) => {
    try {
        console.log(`---------------------------- ${contractName} --------------------------------`);

        const Contract = await hre.ethers.getContractFactory(contractName, signer);

        let options = { gasPrice, nonce, gasLimit: 8000000 };

        if (nonce === -1) {
            options = { gasPrice };
        }

        let contract;
        if (args.length === 0) {
            console.log("Pre deploy: ");
            contract = await Contract.deploy(options);
        } else {
            contract = await Contract.deploy(...args, options);
        }

        console.log(`${action} ${contractName}: ${contract.deployTransaction.hash}`);
        console.log(`Gas price: ${parseInt(gasPrice.toString(), 10) / 1e9}`);

        await contract.deployed();
        const tx = await contract.deployTransaction.wait(1);

        console.log(`Gas used: ${tx.gasUsed}`);
        console.log(`${contractName} deployed to:`, contract.address);
        console.log(`Mainnet link: https://etherscan.io/address/${contract.address}`);

        await write(contractName, hre.network.name, contract.address, ...args);
        console.log('-------------------------------------------------------------');
        return contract;
    } catch (e) {
        console.log(e);
        return null;
    }
};

// eslint-disable-next-line max-len
const deployWithResend = (contractName, signer, action, exGasPrice, nonce, ...args) => new Promise((resolve) => {
    getGasPrice(exGasPrice).then((gasPrice) => {
        const deployPromise = deploy(contractName, signer, action, gasPrice, nonce, ...args);

        const redeployTime = process.env.REDEPLOY_TIME_IN_MINUTES;

        if (!redeployTime) {
            console.log('Warning: no redeploy time set');
        } else {
            const timeoutId = setTimeout(
                () => resolve(
                    deployWithResend(contractName, 'Resending', gasPrice, nonce, ...args),
                ),
                parseFloat(redeployTime) * 60 * 1000,
            );

            deployPromise.then((contract) => {
                clearTimeout(timeoutId);

                if (contract !== null) resolve(contract);
            });
        }
    });
});

const deployContract = async (contractName, ...args) => {
    const signers = await hre.ethers.getSigners();
    const address = await signers[0].getAddress();
    const nonce = await hre.ethers.provider.getTransactionCount(address);

    return deployWithResend(
        contractName,
        signers[0],
        'Deploying',
        ethers.BigNumber.from('0'),
        nonce,
        ...args,
    );
};

const deployAsOwner = async (contractName, signer, ...args) => deployWithResend(
    contractName,
    signer,
    'Deploying',
    ethers.BigNumber.from('0'),
    -1,
    ...args,
);

module.exports = {
    deploy,
    deployWithResend,
    deployContract,
    deployAsOwner,
};
