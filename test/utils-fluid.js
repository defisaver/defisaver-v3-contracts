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

const getFluidVaultT1TestPairs = async () => [
    {
        vault: '0x1982CC7b1570C2503282d0A0B41F69b3B28fdcc3',
        collSymbol: 'wstETH',
        debtSymbol: 'USDC',
    },
    {
        vault: '0x6F72895Cf6904489Bcd862c941c3D02a3eE4f03e',
        collSymbol: 'WBTC',
        debtSymbol: 'USDC',
    },
    {
        vault: '0x0C8C77B7FF4c2aF7F6CEBbe67350A490E3DD6cB3',
        collSymbol: 'WETH',
        debtSymbol: 'USDC',
    },
    {
        vault: '0x82B27fA821419F5689381b565a8B0786aA2548De',
        collSymbol: 'wstETH',
        debtSymbol: 'WETH',
    },
];

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
    getFluidVaultT1TestPairs,
};
