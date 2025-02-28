/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { start } = require('./utils/starter');

const {
    redeploy, addrs, network, getOwnerAddr,
} = require('../test/utils');

const { topUp } = require('./utils/fork');
const {
    deployLiquityV2RepayBundle,
    deployLiquityV2BoostBundle,
    deployLiquityV2CloseBundle,
    deployLiquityV2RepayOnPriceBundle,
    deployLiquityV2BoostOnPriceBundle,
} = require('../test/utils-liquityV2');

async function main() {
    const isFork = true;
    const senderAcc = (await hre.ethers.getSigners())[0];
    if (isFork) {
        await topUp(senderAcc.address);
        await topUp(getOwnerAddr());
    }

    const liquityV2View = await redeploy('LiquityV2View', isFork);
    const liquityV2Open = await redeploy('LiquityV2Open', isFork);
    const liquityV2Close = await redeploy('LiquityV2Close', isFork);
    const liquityV2Supply = await redeploy('LiquityV2Supply', isFork);
    const liquityV2Withdraw = await redeploy('LiquityV2Withdraw', isFork);
    const liquityV2Borrow = await redeploy('LiquityV2Borrow', isFork);
    const liquityV2Payback = await redeploy('LiquityV2Payback', isFork);
    console.log(`LiquityV2View: ${liquityV2View.address}`);
    console.log(`LiquityV2Open: ${liquityV2Open.address}`);
    console.log(`LiquityV2Close: ${liquityV2Close.address}`);
    console.log(`LiquityV2Supply: ${liquityV2Supply.address}`);
    console.log(`LiquityV2Withdraw: ${liquityV2Withdraw.address}`);
    console.log(`LiquityV2Borrow: ${liquityV2Borrow.address}`);
    console.log(`LiquityV2Payback: ${liquityV2Payback.address}`);

    const liquityV2Claim = await redeploy('LiquityV2Claim', isFork);
    const liquityV2Adjust = await redeploy('LiquityV2Adjust', isFork);
    const liquityV2AdjustInterestRate = await redeploy('LiquityV2AdjustInterestRate', isFork);
    const liquityV2SPDeposit = await redeploy('LiquityV2SPDeposit', isFork);
    const liquityV2SPWithdraw = await redeploy('LiquityV2SPWithdraw', isFork);
    const liquityV2SPClaimColl = await redeploy('LiquityV2SPClaimColl', isFork);
    const liquityV2AdjustZombieTrove = await redeploy('LiquityV2AdjustZombieTrove', isFork);
    console.log(`LiquityV2Claim: ${liquityV2Claim.address}`);
    console.log(`LiquityV2Adjust: ${liquityV2Adjust.address}`);
    console.log(`LiquityV2AdjustInterestRate: ${liquityV2AdjustInterestRate.address}`);
    console.log(`LiquityV2SPDeposit: ${liquityV2SPDeposit.address}`);
    console.log(`LiquityV2SPWithdraw: ${liquityV2SPWithdraw.address}`);
    console.log(`LiquityV2SPClaimColl: ${liquityV2SPClaimColl.address}`);
    console.log(`LiquityV2AdjustZombieTrove: ${liquityV2AdjustZombieTrove.address}`);

    /* //////////////////////////////////////////////////////////////
                            AUTOMATION
    ////////////////////////////////////////////////////////////// */
    const liquityV2RatioTrigger = await redeploy('LiquityV2RatioTrigger', isFork);
    const liquityV2RatioCheck = await redeploy('LiquityV2RatioCheck', isFork);
    const closePriceTrigger = await redeploy('ClosePriceTrigger', isFork);
    const liquityV2TargetRatioCheck = await redeploy('LiquityV2TargetRatioCheck', isFork);
    const liquityV2QuotePriceTrigger = await redeploy('LiquityV2QuotePriceTrigger', isFork);
    const sendTokensAndUnwrap = await redeploy('SendTokensAndUnwrap', isFork);
    console.log(`LiquityV2RatioTrigger: ${liquityV2RatioTrigger.address}`);
    console.log(`LiquityV2RatioCheck: ${liquityV2RatioCheck.address}`);
    console.log(`ClosePriceTrigger: ${closePriceTrigger.address}`);
    console.log(`LiquityV2TargetRatioCheck: ${liquityV2TargetRatioCheck.address}`);
    console.log(`LiquityV2QuotePriceTrigger: ${liquityV2QuotePriceTrigger.address}`);
    console.log(`SendTokensAndUnwrap: ${sendTokensAndUnwrap.address}`);

    const repayBundleId = await deployLiquityV2RepayBundle(senderAcc, isFork);
    const boostBundleId = await deployLiquityV2BoostBundle(senderAcc, isFork);
    const closeBundleId = await deployLiquityV2CloseBundle(senderAcc, isFork);
    const repayOnPriceBundleId = await deployLiquityV2RepayOnPriceBundle(senderAcc, isFork);
    const boostOnPriceBundleId = await deployLiquityV2BoostOnPriceBundle(senderAcc, isFork);

    console.log(`Repay bundle id: ${repayBundleId}`);
    console.log(`Boost bundle id: ${boostBundleId}`);
    console.log(`Close bundle id: ${closeBundleId}`);
    console.log(`Repay on Price bundle id: ${repayOnPriceBundleId}`);
    console.log(`Boost on Price bundle id: ${boostOnPriceBundleId}`);
    process.exit(0);
}

start(main);
