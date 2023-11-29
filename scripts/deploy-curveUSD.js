/* eslint-disable max-len */
/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');
const { start } = require('./utils/starter');

const {
    redeploy, addrs, network, openStrategyAndBundleStorage,
} = require('../test/utils');

const { topUp } = require('./utils/fork');
const { createCurveUsdAdvancedRepayStrategy, createCurveUsdRepayStrategy, createCurveUsdFLRepayStrategy } = require('../test/strategies');
const { createStrategy, createBundle } = require('../test/utils-strategies');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);

    const curveusdrepay = await redeploy('CurveUsdRepay', addrs[network].REGISTRY_ADDR, true, true);
    const curvetrigger = await redeploy('CurveUsdCollRatioTrigger', addrs[network].REGISTRY_ADDR, true, true);
    const curvechecker = await redeploy('CurveUsdCollRatioCheck', addrs[network].REGISTRY_ADDR, true, true);
    const curveswapper = await redeploy('CurveUsdSwapper', addrs[network].REGISTRY_ADDR, true, true);
    const curveUsdAdvancedRepayStrategy = createCurveUsdAdvancedRepayStrategy();
    const curveUsdRepayStrategy = createCurveUsdRepayStrategy();
    const curveUsdFLRepayStrategy = createCurveUsdFLRepayStrategy();
    await openStrategyAndBundleStorage(true);
    const strategyIdFirst = await createStrategy(undefined, ...curveUsdAdvancedRepayStrategy, true);
    const strategyIdSecond = await createStrategy(undefined, ...curveUsdRepayStrategy, true);
    const strategyIdThird = await createStrategy(undefined, ...curveUsdFLRepayStrategy, true);
    const bundleId = await createBundle(
        undefined,
        [strategyIdFirst, strategyIdSecond, strategyIdThird],
    );

    console.log('CurveUsdRepay deployed to:', curveusdrepay.address);
    console.log('CurveUsdCollRatioTrigger deployed to:', curvetrigger.address);
    console.log('CurveUsdCollRatioCheck deployed to:', curvechecker.address);
    console.log('CurveUsdSwapper deployed to:', curveswapper.address);

    console.log(bundleId);

    process.exit(0);
}

start(main);
