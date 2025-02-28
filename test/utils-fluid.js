const {
    openStrategyAndBundleStorage,
    network,
} = require('./utils');
const {
    createFluidT1RepayStrategy,
    createFluidT1FLRepayStrategy,
    createFluidT1BoostStrategy,
    createFluidT1FLBoostStrategy,
} = require('./strategies');
const { createStrategy, createBundle } = require('./utils-strategies');
const { createFluidT1RepayL2Strategy, createFluidT1BoostL2Strategy, createFluidT1FLRepayL2Strategy, createFluidT1FLBoostL2Strategy } = require('./l2-strategies');

const t1Vaults = {
    mainnet: [
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
    ],
    arbitrum: [
        {
            vault: '0xeAbBfca72F8a8bf14C4ac59e69ECB2eB69F0811C',
            collSymbol: 'WETH',
            debtSymbol: 'USDC',
        },
        {
            vault: '0xA0F83Fc5885cEBc0420ce7C7b139Adc80c4F4D91',
            collSymbol: 'wstETH',
            debtSymbol: 'USDC',
        },
        {
            vault: '0xE16A6f5359ABB1f61cE71e25dD0932e3E00B00eB',
            collSymbol: 'WBTC',
            debtSymbol: 'USDC',
        },
    ],
    base: [
        {
            vault: '0xeAbBfca72F8a8bf14C4ac59e69ECB2eB69F0811C',
            collSymbol: 'WETH',
            debtSymbol: 'USDC',
        },
        {
            vault: '0xbEC491FeF7B4f666b270F9D5E5C3f443cBf20991',
            collSymbol: 'wstETH',
            debtSymbol: 'USDC',
        },
    ],
};

const getFluidVaultT1TestPairs = async () => t1Vaults[network];

const deployFluidT1RepayBundle = async (proxy, isFork) => {
    await openStrategyAndBundleStorage(isFork);
    const repayStrategy = network !== 'mainnet' ? createFluidT1RepayL2Strategy() : createFluidT1RepayStrategy();
    const flRepayStrategy = network !== 'mainnet' ? createFluidT1FLRepayL2Strategy() : createFluidT1FLRepayStrategy();
    const repayStrategyId = await createStrategy(...repayStrategy, true);
    const flRepayStrategyId = await createStrategy(...flRepayStrategy, true);
    const bundleId = await createBundle(proxy, [repayStrategyId, flRepayStrategyId]);
    return bundleId;
};

const deployFluidT1BoostBundle = async (proxy, isFork) => {
    await openStrategyAndBundleStorage(isFork);
    const boostStrategy = network !== 'mainnet' ? createFluidT1BoostL2Strategy() : createFluidT1BoostStrategy();
    const flBoostStrategy = network !== 'mainnet' ? createFluidT1FLBoostL2Strategy() : createFluidT1FLBoostStrategy();
    const boostStrategyId = await createStrategy(...boostStrategy, true);
    const flBoostStrategyId = await createStrategy(...flBoostStrategy, true);
    const bundleId = await createBundle(proxy, [boostStrategyId, flBoostStrategyId]);
    return bundleId;
};

module.exports = {
    deployFluidT1RepayBundle,
    deployFluidT1BoostBundle,
    getFluidVaultT1TestPairs,
};
