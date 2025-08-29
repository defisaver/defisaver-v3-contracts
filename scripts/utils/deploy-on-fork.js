/* eslint-disable no-await-in-loop */
/* eslint-disable import/no-extraneous-dependencies */

const hre = require("hardhat");
const { redeploy, getOwnerAddr } = require("../../test/utils/utils");
const { topUp } = require("./fork");

async function deployOnFork(contractNames) {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);
    await topUp(getOwnerAddr());
    for (let i = 0; i < contractNames.length; ++i) {
        const contract = await redeploy(contractNames[i], true);
        console.log(`${contractNames[i]}: ${contract.address}`);
    }
}

const contractNames = process.env.CONTRACTS ? process.env.CONTRACTS.split(" ") : [];

if (contractNames.length === 0) {
    console.error("Error: No contract names provided. Use CONTRACTS env variable.");
    process.exit(1);
}

deployOnFork(contractNames)
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
