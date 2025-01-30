const {
    openStrategyAndBundleStorage,
} = require('./utils');
const {
    createFluidT1RepayStrategy,
    createFluidT1FLRepayStrategy,
    createFluidT1BoostStrategy,
    createFluidT1FLBoostStrategy,
} = require('./strategies');
const { createStrategy, createBundle } = require('./utils-strategies');

const deployFluidT1RepayBundle = async (proxy, isFork) => {
    await openStrategyAndBundleStorage(isFork);
    const repayStrategy = createFluidT1RepayStrategy();
    const flRepayStrategy = createFluidT1FLRepayStrategy();
    const repayStrategyId = await createStrategy(proxy, ...repayStrategy, true);
    const flRepayStrategyId = await createStrategy(proxy, ...flRepayStrategy, true);
    const bundleId = await createBundle(proxy, [repayStrategyId, flRepayStrategyId]);
    return bundleId;
};

const deployFluidT1BoostBundle = async (proxy, isFork) => {
    await openStrategyAndBundleStorage(isFork);
    const boostStrategy = createFluidT1BoostStrategy();
    const flBoostStrategy = createFluidT1FLBoostStrategy();
    const boostStrategyId = await createStrategy(proxy, ...boostStrategy, true);
    const flBoostStrategyId = await createStrategy(proxy, ...flBoostStrategy, true);
    const bundleId = await createBundle(proxy, [boostStrategyId, flBoostStrategyId]);
    return bundleId;
};

module.exports = {
    deployFluidT1RepayBundle,
    deployFluidT1BoostBundle,
};
