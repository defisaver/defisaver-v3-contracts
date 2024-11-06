/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { start } = require('./utils/starter');

const {
    redeploy, addrs, network, getOwnerAddr,
    openStrategyAndBundleStorage,
    DAI_ADDR,
    setBalance,
    getProxy,
} = require('../test/utils');

const { topUp } = require('./utils/fork');
const {
    createLiquityV2RepayStrategy,
    createLiquityV2FLRepayStrategy,
    createLiquityV2BoostStrategy,
    createLiquityV2FLBoostStrategy,
    createLiquityV2FLBoostWithCollStrategy,
    createLiquityV2CloseToCollStrategy,
    createLiquityV2FLCloseToCollStrategy,
    createLiquityV2FLCloseToDebtStrategy,
} = require('../test/strategies');
const { createStrategy, createBundle } = require('../test/utils-strategies');
const { uniV3CreatePool } = require('../test/actions');

const BOLD_TOKEN = '0xBB57F8Ad4bAF3970270E78f55EbEeB1e0bef3Ccb';

const deployLiquityV2RepayBundle = async (proxy, isFork) => {
    await openStrategyAndBundleStorage(isFork);
    const repayStrategy = createLiquityV2RepayStrategy();
    const flRepayStrategy = createLiquityV2FLRepayStrategy();
    const repayStrategyId = await createStrategy(proxy, ...repayStrategy, true);
    const flRepayStrategyId = await createStrategy(proxy, ...flRepayStrategy, true);
    const bundleId = await createBundle(proxy, [repayStrategyId, flRepayStrategyId]);
    return bundleId;
};

const deployLiquityV2BoostBundle = async (proxy, isFork) => {
    await openStrategyAndBundleStorage(isFork);
    const boostStrategy = createLiquityV2BoostStrategy();
    const flBoostStrategy = createLiquityV2FLBoostStrategy();
    const flBoostWithCollStrategy = createLiquityV2FLBoostWithCollStrategy();
    const boostStrategyId = await createStrategy(proxy, ...boostStrategy, true);
    const flBoostStrategyId = await createStrategy(proxy, ...flBoostStrategy, true);
    const flBoostWithCollStrategyId = await createStrategy(proxy, ...flBoostWithCollStrategy, true);
    const bundleId = await createBundle(
        proxy, [boostStrategyId, flBoostStrategyId, flBoostWithCollStrategyId],
    );
    return bundleId;
};

const deployLiquityV2CloseBundle = async (proxy, isFork) => {
    await openStrategyAndBundleStorage(isFork);

    const closeToCollateral = createLiquityV2CloseToCollStrategy();
    const closeToCollateralStrategyId = await createStrategy(proxy, ...closeToCollateral, false);

    const flCloseToCollateral = createLiquityV2FLCloseToCollStrategy();
    const flCloseToCollateralStrategyId = await createStrategy(
        proxy, ...flCloseToCollateral, false,
    );

    const flCloseToDebt = createLiquityV2FLCloseToDebtStrategy();
    const flCloseToDebtStrategyId = await createStrategy(proxy, ...flCloseToDebt, false);

    const bundleId = await createBundle(
        proxy,
        [
            closeToCollateralStrategyId,
            flCloseToCollateralStrategyId,
            flCloseToDebtStrategyId,
        ],
    );
    return bundleId;
};

const provideBoldLiquidity = async (proxy, senderAcc) => {
    const dai = DAI_ADDR;
    const boldAmount = hre.ethers.utils.parseUnits('1000000000', 18);
    const daiAmount = hre.ethers.utils.parseUnits('1000000000', 18);
    await setBalance(BOLD_TOKEN, senderAcc.address, boldAmount);
    await setBalance(dai, senderAcc.address, daiAmount);
    await uniV3CreatePool(
        proxy,
        BOLD_TOKEN,
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
    const shouldClosePriceTrigger = await redeploy('ShouldClosePriceTrigger', addrs[network].REGISTRY_ADDR, false, isFork);
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
    console.log(`ShouldClosePriceTrigger: ${shouldClosePriceTrigger.address}`);
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
