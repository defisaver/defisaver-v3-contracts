/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');

const { topUp } = require('./utils/fork');
const {
    openStrategyAndBundleStorage,
} = require('../test/utils');
const {
    createAaveV3RepayOnPriceL2Strategy,
    createAaveV3FlRepayOnPriceL2Strategy,
} = require('../test/l2-strategies');
const { createStrategy, createBundle } = require('../test/utils-strategies');

const deployBundleL2 = async () => {
    await openStrategyAndBundleStorage(true);
    const aaveV3RepayOnPriceStrategyEncoded = createAaveV3RepayOnPriceL2Strategy();
    const aaveV3FlRepayOnPriceStrategyEncoded = createAaveV3FlRepayOnPriceL2Strategy();

    const repayStrategyId1 = await createStrategy(null, ...aaveV3RepayOnPriceStrategyEncoded, false);
    const repayStrategyId2 = await createStrategy(null, ...aaveV3FlRepayOnPriceStrategyEncoded, false);

    const repayBundleId = await createBundle(null, [repayStrategyId1, repayStrategyId2]);

    return { repayBundleId };
};

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);

    const { repayBundleId } = await deployBundleL2();

    console.log(repayBundleId);

    process.exit(0);
}

main();
