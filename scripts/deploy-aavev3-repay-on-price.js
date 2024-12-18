/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');

const { topUp } = require('./utils/fork');
const {
    openStrategyAndBundleStorage,
} = require('../test/utils');
const {
    createAaveV3RepayOnPriceStrategy,
    createAaveV3FlRepayOnPriceStrategy,
} = require('../test/strategies');
const { createStrategy, createBundle } = require('../test/utils-strategies');

const deployBundle = async () => {
    await openStrategyAndBundleStorage(true);
    const aaveV3RepayOnPriceStrategyEncoded = createAaveV3RepayOnPriceStrategy();
    const aaveV3FlRepayOnPriceStrategyEncoded = createAaveV3FlRepayOnPriceStrategy();

    const repayStrategyId1 = await createStrategy(null, ...aaveV3RepayOnPriceStrategyEncoded, false);
    const repayStrategyId2 = await createStrategy(null, ...aaveV3FlRepayOnPriceStrategyEncoded, false);

    const repayBundleId = await createBundle(null, [repayStrategyId1, repayStrategyId2]);

    return { repayBundleId };
};

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);

    const { repayBundleId } = await deployBundle();

    console.log(repayBundleId);

    process.exit(0);
}

main();
