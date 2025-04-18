const { getAssetInfoByAddress, getAssetInfo } = require('@defisaver/tokens');
const hre = require('hardhat');
const {
    openStrategyAndBundleStorage,
    network,
    getContractFromRegistry,
    chainIds,
    fetchAmountInUSDPrice,
    setBalance,
    ETH_ADDR,
    approve,
} = require('./utils');
const {
    createFluidT1RepayStrategy,
    createFluidT1FLRepayStrategy,
    createFluidT1BoostStrategy,
    createFluidT1FLBoostStrategy,
} = require('../../strategies-spec/mainnet');
const { createStrategy, createBundle } = require('../strategies/utils/utils-strategies');
const {
    createFluidT1RepayL2Strategy,
    createFluidT1BoostL2Strategy,
    createFluidT1FLRepayL2Strategy,
    createFluidT1FLBoostL2Strategy,
} = require('../../strategies-spec/l2');
const { fluidDexOpen } = require('./actions');

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

const t4Vaults = {
    mainnet: [
        {
            vault: '0x469D8c7990b9072EEF05d6349224621a71176213',
            collSymbol0: 'USDC',
            collSymbol1: 'ETH',
            debtSymbol0: 'USDC',
            debtSymbol1: 'ETH',
        },
    ],
};

const MIN_DEPOSIT_SHARES_TO_MINT = 1;
const MAX_DEPOSIT_SHARES_TO_BURN = hre.ethers.constants.MaxInt256;
const MIN_COLLATERAL_TO_WITHDRAW = 1;
const MIN_DEBT_SHARES_TO_BURN = 1;
const MAX_DEBT_SHARES_TO_MINT = hre.ethers.constants.MaxInt256;

const getFluidVaultT1TestPairs = () => t1Vaults[network];
const getFluidVaultT4TestPairs = () => t4Vaults[network];

const deployFluidT1RepayBundle = async (proxy, isFork) => {
    await openStrategyAndBundleStorage(isFork);
    const repayStrategy = network !== 'mainnet' ? createFluidT1RepayL2Strategy() : createFluidT1RepayStrategy();
    const flRepayStrategy = network !== 'mainnet' ? createFluidT1FLRepayL2Strategy() : createFluidT1FLRepayStrategy();
    const repayStrategyId = await createStrategy(...repayStrategy, true);
    const flRepayStrategyId = await createStrategy(...flRepayStrategy, true);
    const bundleId = await createBundle([repayStrategyId, flRepayStrategyId]);
    return bundleId;
};

const deployFluidT1BoostBundle = async (proxy, isFork) => {
    await openStrategyAndBundleStorage(isFork);
    const boostStrategy = network !== 'mainnet' ? createFluidT1BoostL2Strategy() : createFluidT1BoostStrategy();
    const flBoostStrategy = network !== 'mainnet' ? createFluidT1FLBoostL2Strategy() : createFluidT1FLBoostStrategy();
    const boostStrategyId = await createStrategy(...boostStrategy, true);
    const flBoostStrategyId = await createStrategy(...flBoostStrategy, true);
    const bundleId = await createBundle([boostStrategyId, flBoostStrategyId]);
    return bundleId;
};

const supplyLimitReached = (dexSupplyData, newShares) => (
    dexSupplyData.maxSupplyShares.lt(dexSupplyData.totalSupplyShares.add(newShares))
);

const borrowLimitReached = (dexBorrowData, newShares) => (
    dexBorrowData.maxBorrowShares.lt(dexBorrowData.totalBorrowShares.add(newShares))
);

const openFluidT4Vault = async (
    proxy,
    senderAcc,
    vault,
    collAmount0InUSD,
    collAmount1InUSD,
    borrowAmount0InUSD,
    borrowAmount1InUSD,
    isFork,
) => {
    const fluidView = await getContractFromRegistry('FluidView', isFork);
    const vaultData = await fluidView.callStatic.getVaultData(vault);

    const weth = getAssetInfo('WETH', chainIds[network]);

    const collAsset0 = getAssetInfoByAddress(
        vaultData.supplyToken0 === ETH_ADDR ? weth.address : vaultData.supplyToken0,
        chainIds[network],
    );
    const collAsset1 = getAssetInfoByAddress(
        vaultData.supplyToken1 === ETH_ADDR ? weth.address : vaultData.supplyToken1,
        chainIds[network],
    );
    const borrowAsset0 = getAssetInfoByAddress(
        vaultData.borrowToken0 === ETH_ADDR ? weth.address : vaultData.borrowToken0,
        chainIds[network],
    );
    const borrowAsset1 = getAssetInfoByAddress(
        vaultData.borrowToken1 === ETH_ADDR ? weth.address : vaultData.borrowToken1,
        chainIds[network],
    );

    // Handle collateral 0
    let collAmount0 = 0;
    if (collAmount0InUSD > 0) {
        collAmount0 = await fetchAmountInUSDPrice(collAsset0.symbol, collAmount0InUSD);
        await setBalance(collAsset0.address, senderAcc.address, collAmount0);
        await approve(collAsset0.address, proxy.address, senderAcc);
    }

    // Handle collateral 1
    let collAmount1 = 0;
    if (collAmount1InUSD > 0) {
        collAmount1 = await fetchAmountInUSDPrice(collAsset1.symbol, collAmount1InUSD);
        await setBalance(collAsset1.address, senderAcc.address, collAmount1);
        await approve(collAsset1.address, proxy.address, senderAcc);
    }

    // Check if supply limit is reached
    if (supplyLimitReached(vaultData.dexSupplyData, 1)) {
        return 0;
    }

    // Handle borrow token 0
    let borrowAmount0 = 0;
    if (borrowAmount0InUSD > 0) {
        borrowAmount0 = await fetchAmountInUSDPrice(borrowAsset0.symbol, borrowAmount0InUSD);
    }

    // Handle borrow token 1
    let borrowAmount1 = 0;
    if (borrowAmount1InUSD > 0) {
        borrowAmount1 = await fetchAmountInUSDPrice(borrowAsset1.symbol, borrowAmount1InUSD);
    }

    // Check if borrow limit is reached
    if (borrowAmount0 !== 0 || borrowAmount1 !== 0) {
        if (borrowLimitReached(vaultData.dexBorrowData, 1)) {
            return 0;
        }
    }

    // Execute action
    await fluidDexOpen(
        proxy,
        vault,
        senderAcc.address,
        senderAcc.address,
        0,
        [collAmount0, collAmount1, MIN_DEPOSIT_SHARES_TO_MINT],
        0,
        [borrowAmount0, borrowAmount1, MAX_DEBT_SHARES_TO_MINT],
        true,
    );

    const nftIds = await fluidView.getUserNftIds(proxy.address);

    return nftIds[nftIds.length - 1];
};

module.exports = {
    deployFluidT1RepayBundle,
    deployFluidT1BoostBundle,
    openFluidT4Vault,
    getFluidVaultT1TestPairs,
    getFluidVaultT4TestPairs,
    MIN_DEPOSIT_SHARES_TO_MINT,
    MAX_DEPOSIT_SHARES_TO_BURN,
    MIN_DEBT_SHARES_TO_BURN,
    MAX_DEBT_SHARES_TO_MINT,
    MIN_COLLATERAL_TO_WITHDRAW,
};
