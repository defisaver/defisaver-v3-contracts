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

    const curveUsdRepay = await redeploy('CurveUsdRepay', true);
    const curveUsdCollRatioTrigger = await redeploy('CurveUsdCollRatioTrigger', true);
    const curveUsdCollRatioCheck = await redeploy('CurveUsdCollRatioCheck', true);
    const curveUsdSwapper = await redeploy('CurveUsdSwapper', true);

    await openStrategyAndBundleStorage(true);

    const curveUsdAdvancedRepayStrategy = createCurveUsdAdvancedRepayStrategy();
    const curveUsdRepayStrategy = createCurveUsdRepayStrategy();
    const curveUsdFLRepayStrategy = createCurveUsdFLRepayStrategy();
    const strategyRepayIdFirst = await createStrategy(...curveUsdAdvancedRepayStrategy, true);
    const strategyRepayIdSecond = await createStrategy(...curveUsdRepayStrategy, true);
    const strategyRepayIdThird = await createStrategy(...curveUsdFLRepayStrategy, true);

    const repayBundleId = await createBundle(
        undefined,
        [strategyRepayIdFirst, strategyRepayIdSecond, strategyRepayIdThird],
    );

    const curveUsdBoostStrategy = createCurveUsdBoostStrategy();
    const curveUsdFLCollBoostStrategy = createCurveUsdFLCollBoostStrategy();
    const curveUsdFLDebtBoostStrategy = createCurveUsdFLDebtBoostStrategy();
    const strategyIdFirst = await createStrategy(...curveUsdBoostStrategy, true);
    const strategyIdSecond = await createStrategy(...curveUsdFLCollBoostStrategy, true);
    const strategyIdThird = await createStrategy(...curveUsdFLDebtBoostStrategy, true);
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
