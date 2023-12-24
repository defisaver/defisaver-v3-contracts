/* eslint-disable import/no-extraneous-dependencies */

const hre = require('hardhat');

const { topUp } = require('./utils/fork');
const {
    redeploy,
    addrs,
    network,
    openStrategyAndBundleStorage,
} = require('../test/utils');
const {
    createCompV3RepayL2Strategy,
    createCompV3FLRepayL2Strategy,
    createCompV3BoostL2Strategy,
    createCompV3FLBoostL2Strategy,
} = require('../test/l2-strategies');
const { createStrategy, createBundle } = require('../test/utils-strategies');

const deployBundles = async () => {
    await openStrategyAndBundleStorage(true);
    const compV3RepayStrategyEncoded = createCompV3RepayL2Strategy();
    const compV3FLRepayStrategyEncoded = createCompV3FLRepayL2Strategy();

    const repayStrategyId1 = await createStrategy(null, ...compV3RepayStrategyEncoded, true);
    const repayStrategyId2 = await createStrategy(null, ...compV3FLRepayStrategyEncoded, true);

    const repayBundleId = await createBundle(null, [repayStrategyId1, repayStrategyId2]);

    const compV3BoostStrategyEncoded = createCompV3BoostL2Strategy();
    const compV3FLBoostStrategyEncoded = createCompV3FLBoostL2Strategy();

    const boostStrategyId1 = await createStrategy(null, ...compV3BoostStrategyEncoded, true);
    const boostStrategyId2 = await createStrategy(null, ...compV3FLBoostStrategyEncoded, true);

    const boostBundleId = await createBundle(null, [boostStrategyId1, boostStrategyId2]);

    return { repayBundleId, boostBundleId };
};

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address);

    const { repayBundleId, boostBundleId } = await deployBundles();

    console.log(repayBundleId, boostBundleId);

    await redeploy('CompV3SubProxyL2', addrs[network].REGISTRY_ADDR, true, true, repayBundleId, boostBundleId);
    await redeploy('CompV3View', addrs[network].REGISTRY_ADDR, true, true);
    await redeploy('CompV3RatioCheck', addrs[network].REGISTRY_ADDR, true, true);
    await redeploy('CompV3RatioTrigger', addrs[network].REGISTRY_ADDR, true, true);

    process.exit(0);
}

main();
