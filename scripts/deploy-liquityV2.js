/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { start } = require('./utils/starter');

const {
    redeploy, addrs, network, getOwnerAddr,
    DAI_ADDR,
    setBalance,
    getProxy,
    BOLD_ADDR,
} = require('../test/utils');

const { topUp } = require('./utils/fork');
const { uniV3CreatePool } = require('../test/actions');
const { deployLiquityV2RepayBundle, deployLiquityV2BoostBundle, deployLiquityV2CloseBundle } = require('../test/utils-liquityV2');

const provideBoldLiquidity = async (proxy, senderAcc) => {
    const dai = DAI_ADDR;
    const boldAmount = hre.ethers.utils.parseUnits('1000000000', 18);
    const daiAmount = hre.ethers.utils.parseUnits('1000000000', 18);
    await setBalance(BOLD_ADDR, senderAcc.address, boldAmount);
    await setBalance(dai, senderAcc.address, daiAmount);
    await uniV3CreatePool(
        proxy,
        BOLD_ADDR,
        dai,
        '100',
        -101, // math.floor(math.log(p, 1.0001)) where p is 0.99
        99, // math.floor(math.log(p, 1.0001)) where p is 1.01
        boldAmount,
        daiAmount,
        senderAcc.address,
        senderAcc.address,
        '79228162514264337593543950336', // 2**96
    );
};

async function main() {
    const isFork = true;
    const senderAcc = (await hre.ethers.getSigners())[0];
    if (isFork) {
        await topUp(senderAcc.address);
        await topUp(getOwnerAddr());
    }
    let proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
    proxy = proxy.connect(senderAcc);

    const liquityV2View = await redeploy('LiquityV2View', addrs[network].REGISTRY_ADDR, false, isFork);
    const liquityV2Open = await redeploy('LiquityV2Open', addrs[network].REGISTRY_ADDR, false, isFork);
    const liquityV2Close = await redeploy('LiquityV2Close', addrs[network].REGISTRY_ADDR, false, isFork);
    const liquityV2Supply = await redeploy('LiquityV2Supply', addrs[network].REGISTRY_ADDR, false, isFork);
    const liquityV2Withdraw = await redeploy('LiquityV2Withdraw', addrs[network].REGISTRY_ADDR, false, isFork);
    const liquityV2Borrow = await redeploy('LiquityV2Borrow', addrs[network].REGISTRY_ADDR, false, isFork);
    const liquityV2Payback = await redeploy('LiquityV2Payback', addrs[network].REGISTRY_ADDR, false, isFork);
    const liquityV2Claim = await redeploy('LiquityV2Claim', addrs[network].REGISTRY_ADDR, false, isFork);
    const liquityV2Adjust = await redeploy('LiquityV2Adjust', addrs[network].REGISTRY_ADDR, false, isFork);
    const liquityV2AdjustInterestRate = await redeploy('LiquityV2AdjustInterestRate', addrs[network].REGISTRY_ADDR, false, isFork);
    const liquityV2SPDeposit = await redeploy('LiquityV2SPDeposit', addrs[network].REGISTRY_ADDR, false, isFork);
    const liquityV2SPWithdraw = await redeploy('LiquityV2SPWithdraw', addrs[network].REGISTRY_ADDR, false, isFork);
    const liquityV2SPClaimColl = await redeploy('LiquityV2SPClaimColl', addrs[network].REGISTRY_ADDR, false, isFork);
    const liquityV2RatioTrigger = await redeploy('LiquityV2RatioTrigger', addrs[network].REGISTRY_ADDR, false, isFork);
    const liquityV2RatioCheck = await redeploy('LiquityV2RatioCheck', addrs[network].REGISTRY_ADDR, false, isFork);
    const closePriceTrigger = await redeploy('ClosePriceTrigger', addrs[network].REGISTRY_ADDR, false, isFork);
    const sendTokensAndUnwrap = await redeploy('SendTokensAndUnwrap', addrs[network].REGISTRY_ADDR, false, isFork);

    console.log(`LiquityV2View: ${liquityV2View.address}`);
    console.log(`LiquityV2Open: ${liquityV2Open.address}`);
    console.log(`LiquityV2Close: ${liquityV2Close.address}`);
    console.log(`LiquityV2Supply: ${liquityV2Supply.address}`);
    console.log(`LiquityV2Withdraw: ${liquityV2Withdraw.address}`);
    console.log(`LiquityV2Borrow: ${liquityV2Borrow.address}`);
    console.log(`LiquityV2Payback: ${liquityV2Payback.address}`);
    console.log(`LiquityV2Claim: ${liquityV2Claim.address}`);
    console.log(`LiquityV2Adjust: ${liquityV2Adjust.address}`);
    console.log(`LiquityV2AdjustInterestRate: ${liquityV2AdjustInterestRate.address}`);
    console.log(`LiquityV2SPDeposit: ${liquityV2SPDeposit.address}`);
    console.log(`LiquityV2SPWithdraw: ${liquityV2SPWithdraw.address}`);
    console.log(`LiquityV2SPClaimColl: ${liquityV2SPClaimColl.address}`);
    console.log(`LiquityV2RatioTrigger: ${liquityV2RatioTrigger.address}`);
    console.log(`LiquityV2RatioCheck: ${liquityV2RatioCheck.address}`);
    console.log(`ClosePriceTrigger: ${closePriceTrigger.address}`);
    console.log(`SendTokensAndUnwrap: ${sendTokensAndUnwrap.address}`);

    const repayBundleId = await deployLiquityV2RepayBundle(senderAcc, isFork);
    const boostBundleId = await deployLiquityV2BoostBundle(senderAcc, isFork);
    const closeBundleId = await deployLiquityV2CloseBundle(senderAcc, isFork);

    console.log(`Repay bundle id: ${repayBundleId}`);
    console.log(`Boost bundle id: ${boostBundleId}`);
    console.log(`Close bundle id: ${closeBundleId}`);

    await provideBoldLiquidity(proxy, senderAcc);

    process.exit(0);
}

start(main);
