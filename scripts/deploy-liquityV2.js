/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { start } = require('./utils/starter');

const {
    redeploy, addrs, network, getOwnerAddr,
} = require('../test/utils');

const { topUp } = require('./utils/fork');

async function main() {
    const isFork = false;
    const senderAcc = (await hre.ethers.getSigners())[0];
    if (isFork) {
        await topUp(senderAcc.address);
        await topUp(getOwnerAddr());
    }

    const liquityV2Open = await redeploy('LiquityV2Open', addrs[network].REGISTRY_ADDR, false, isFork);
    const liquityV2Close = await redeploy('LiquityV2Close', addrs[network].REGISTRY_ADDR, false, isFork);
    const liquityV2Supply = await redeploy('LiquityV2Supply', addrs[network].REGISTRY_ADDR, false, isFork);
    const liquityV2Withdraw = await redeploy('LiquityV2Withdraw', addrs[network].REGISTRY_ADDR, false, isFork);
    const liquityV2Borrow = await redeploy('LiquityV2Borrow', addrs[network].REGISTRY_ADDR, false, isFork);
    const liquityV2Payback = await redeploy('LiquityV2Payback', addrs[network].REGISTRY_ADDR, false, isFork);
    const liquityV2Claim = await redeploy('LiquityV2Claim', addrs[network].REGISTRY_ADDR, false, isFork);
    const liquityV2Adjust = await redeploy('LiquityV2Adjust', addrs[network].REGISTRY_ADDR, false, isFork);
    const liquityV2AdjustInterestRate = await redeploy('LiquityV2AdjustInterestRate', addrs[network].REGISTRY_ADDR, false, isFork);
    const liquityV2View = await redeploy('LiquityV2View', addrs[network].REGISTRY_ADDR, false, isFork);

    console.log(`LiquityV2Open: ${liquityV2Open.address}`);
    console.log(`LiquityV2Close: ${liquityV2Close.address}`);
    console.log(`LiquityV2Supply: ${liquityV2Supply.address}`);
    console.log(`LiquityV2Withdraw: ${liquityV2Withdraw.address}`);
    console.log(`LiquityV2Borrow: ${liquityV2Borrow.address}`);
    console.log(`LiquityV2Payback: ${liquityV2Payback.address}`);
    console.log(`LiquityV2Claim: ${liquityV2Claim.address}`);
    console.log(`LiquityV2Adjust: ${liquityV2Adjust.address}`);
    console.log(`LiquityV2AdjustInterestRate: ${liquityV2AdjustInterestRate.address}`);
    console.log(`LiquityV2View: ${liquityV2View.address}`);

    process.exit(0);
}

start(main);
