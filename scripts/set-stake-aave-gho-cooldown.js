/* eslint-disable import/no-extraneous-dependencies */
const hre = require('hardhat');
const { start } = require('./utils/starter');
const { topUp } = require('./utils/fork');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);

    const stkAaveAddr = '0x4da27a545c0c5B758a6BA100e3a049001de870f5';
    const stkGhoAddr = '0x1a88Df1cFe15Af22B3c4c783D4e6F7F9e0C1885d';
    const ownerSigner = await hre.ethers.provider.getSigner('0x5300A1a15135EA4dc7aD5a167152C01EFc9b192A');
    const coolDown = 180;
    const stkAaveContract = await hre.ethers.getContractAt('IStkAave', stkAaveAddr);
    const stkGhoContract = await hre.ethers.getContractAt('IStkAave', stkGhoAddr);
    const stkAaveContractOwner = stkAaveContract.connect(ownerSigner);
    const stkGhoContractOwner = stkGhoContract.connect(ownerSigner);

    await stkAaveContractOwner.setCooldownSeconds(coolDown);
    await stkGhoContractOwner.setCooldownSeconds(coolDown);

    process.exit(0);
}

start(main);
