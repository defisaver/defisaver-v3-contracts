/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { start } = require('./utils/starter');
const {
    getOwnerAddr,
    setBalance,
    approve,
    redeploy,
    addrs,
    getNetwork,
} = require('../test/utils');
const { topUp } = require('./utils/fork');

// TODO: replace once deployed
const REUL_ADDR = '0x5241e34A1eA2BF6F297bAf158e668e23244464a7';

const ACCOUNT_FOR_REWARDS = '0x00000000000000000000000000000000000000AA';
const DEPOSIT_AMOUNT = hre.ethers.utils.parseUnits('10000', 18);

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);
    await topUp(getOwnerAddr());

    const eulerV2RewardsContract = await redeploy('EulerV2ClaimRewards', addrs[getNetwork()].REGISTRY_ADDR, false, true);
    console.log(eulerV2RewardsContract.address);

    const rEULToken = await hre.ethers.getContractAt('IRewardsToken', REUL_ADDR);
    const owner = await rEULToken.owner();
    const underlying = await rEULToken.underlying();
    const ownerSigner = await hre.ethers.provider.getSigner(owner);
    const rEULTokenOwner = rEULToken.connect(ownerSigner);
    const admin = '0x00000000000000000000000000000000DeaDBEAF';
    await rEULTokenOwner.setWhitelistStatus(admin, true);

    const adminSigner = await hre.ethers.provider.getSigner(admin);
    adminSigner.address = admin;
    const rEULTokenAdmin = rEULToken.connect(adminSigner);
    await setBalance(underlying, admin, DEPOSIT_AMOUNT);
    await approve(underlying, REUL_ADDR, adminSigner);
    await rEULTokenAdmin.depositFor(ACCOUNT_FOR_REWARDS, DEPOSIT_AMOUNT);

    const balanceOf = await rEULToken.balanceOf(ACCOUNT_FOR_REWARDS);
    console.log(`Balance of ${ACCOUNT_FOR_REWARDS}: ${balanceOf.toString()}`);

    process.exit(0);
}

start(main);
