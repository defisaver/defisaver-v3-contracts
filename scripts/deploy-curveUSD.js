/* eslint-disable max-len */
/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { start } = require('./utils/starter');

const {
    redeploy, addrs, network, openStrategyAndBundleStorage,
} = require('../test/utils');

const { topUp } = require('./utils/fork');
const {
    createCurveUsdAdvancedRepayStrategy, createCurveUsdRepayStrategy, createCurveUsdFLRepayStrategy, createCurveUsdBoostStrategy, createCurveUsdFLCollBoostStrategy, createCurveUsdFLDebtBoostStrategy,
} = require('../test/strategies');
const { createStrategy, createBundle } = require('../test/utils-strategies');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);

    const curveUsdRepay = await redeploy('CurveUsdRepay', addrs[network].REGISTRY_ADDR, true, true);
    const curveUsdCollRatioTrigger = await redeploy('CurveUsdCollRatioTrigger', addrs[network].REGISTRY_ADDR, true, true);
    const curveUsdCollRatioCheck = await redeploy('CurveUsdCollRatioCheck', addrs[network].REGISTRY_ADDR, true, true);
    const curveUsdSwapper = await redeploy('CurveUsdSwapper', addrs[network].REGISTRY_ADDR, true, true);

    await openStrategyAndBundleStorage(true);

    const curveUsdAdvancedRepayStrategy = createCurveUsdAdvancedRepayStrategy();
    const curveUsdRepayStrategy = createCurveUsdRepayStrategy();
    const curveUsdFLRepayStrategy = createCurveUsdFLRepayStrategy();
    const strategyRepayIdFirst = await createStrategy(undefined, ...curveUsdAdvancedRepayStrategy, true);
    const strategyRepayIdSecond = await createStrategy(undefined, ...curveUsdRepayStrategy, true);
    const strategyRepayIdThird = await createStrategy(undefined, ...curveUsdFLRepayStrategy, true);

    const repayBundleId = await createBundle(
        undefined,
        [strategyRepayIdFirst, strategyRepayIdSecond, strategyRepayIdThird],
    );

    const curveUsdBoostStrategy = createCurveUsdBoostStrategy();
    const curveUsdFLCollBoostStrategy = createCurveUsdFLCollBoostStrategy();
    const curveUsdFLDebtBoostStrategy = createCurveUsdFLDebtBoostStrategy();
    const strategyIdFirst = await createStrategy(undefined, ...curveUsdBoostStrategy, true);
    const strategyIdSecond = await createStrategy(undefined, ...curveUsdFLCollBoostStrategy, true);
    const strategyIdThird = await createStrategy(undefined, ...curveUsdFLDebtBoostStrategy, true);
    const boostBundleId = await createBundle(
        undefined,
        [strategyIdFirst, strategyIdSecond, strategyIdThird],
    );

    console.log('CurveUsdRepay deployed to:', curveUsdRepay.address);
    console.log('CurveUsdCollRatioTrigger deployed to:', curveUsdCollRatioTrigger.address);
    console.log('CurveUsdCollRatioCheck deployed to:', curveUsdCollRatioCheck.address);
    console.log('CurveUsdSwapper deployed to:', curveUsdSwapper.address);

    console.log(`Repay bundle id: ${repayBundleId}`);
    console.log(`Boost bundle id: ${boostBundleId}`);

    process.exit(0);
}

start(main);
