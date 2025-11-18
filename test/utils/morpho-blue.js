const { getAssetInfoByAddress, getAssetInfo } = require('@defisaver/tokens');
const hre = require('hardhat');
const {
    setBalance,
    fetchAmountinUSDPrice,
    approve,
    isNetworkFork,
    openStrategyAndBundleStorage,
    network,
    chainIds,
    fetchAmountInUSDPrice,
    addrs,
} = require('./utils');
const {
    createMorphoBlueFLCloseToDebtL2Strategy,
    createMorphoBlueFLCloseToCollL2Strategy,
} = require('../../strategies-spec/l2');
const {
    createMorphoBlueFLCloseToDebtStrategy,
    createMorphoBlueFLCloseToCollStrategy,
} = require('../../strategies-spec/mainnet');
const { createStrategy, createBundle } = require('../strategies/utils/utils-strategies');
const { morphoBlueSupplyCollateral, morphoBlueBorrow } = require('./actions');

const MORPHO_BLUE_ADDRESS = '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb';
const loanTokenSupplyAmountInUsd = '50000';
const collateralSupplyAmountInUsd = '50000';
const borrowAmountInUsd = '30000';

const getMarkets = () => [
    // wstETH/ETH market
    [
        '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
        '0x2a01eb9496094da03c4e364def50f5ad1280ad72',
        '0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC',
        '945000000000000000',
    ],
    // wstETH/USDC market
    [
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
        '0x48f7e36eb6b826b2df4b2e630b62cd25e89e40e2',
        '0x870ac11d48b15db9a138cf899d20f13f79ba00bc',
        '860000000000000000',
    ],
    // WBTC/USDC market
    [
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
        '0xDddd770BADd886dF3864029e4B377B5F6a2B6b83',
        '0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC',
        '860000000000000000',
    ],
    // sUSDE/DAI_860 market
    [
        '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        '0x9D39A5DE30e57443BfF2A8307A4256c8797A3497',
        '0x5D916980D5Ae1737a8330Bf24dF812b2911Aae25',
        '0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC',
        '860000000000000000',
    ],
];

const MORPHO_BLUE_AUTOMATION_TEST_PAIRS = {
    1: [
        {
            collSymbol: 'wstETH',
            loanSymbol: 'WETH',
            marketParams: {
                loanToken: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                collateralToken: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
                oracle: '0xbD60A6770b27E084E8617335ddE769241B0e71D8',
                irm: '0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC',
                lltv: '965000000000000000',
            },
        },
        {
            collSymbol: 'wstETH',
            loanSymbol: 'USDC',
            marketParams: {
                loanToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                collateralToken: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
                oracle: '0x48f7e36eb6b826b2df4b2e630b62cd25e89e40e2',
                irm: '0x870ac11d48b15db9a138cf899d20f13f79ba00bc',
                lltv: '860000000000000000',
            },
        },
        {
            collSymbol: 'WBTC',
            loanSymbol: 'USDC',
            marketParams: {
                loanToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                collateralToken: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
                oracle: '0xDddd770BADd886dF3864029e4B377B5F6a2B6b83',
                irm: '0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC',
                lltv: '860000000000000000',
            },
        },
    ],
    8453: [
        {
            collSymbol: 'cbBTC',
            loanSymbol: 'USDC',
            marketParams: {
                loanToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
                collateralToken: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
                oracle: '0x663BECd10daE6C4A3Dcd89F1d76c1174199639B9',
                irm: '0x46415998764C29aB2a25CbeA6254146D50D22687',
                lltv: '860000000000000000',
            },
        },
    ],
    42161: [
        {
            collSymbol: 'wstETH',
            loanSymbol: 'USDC',
            marketParams: {
                loanToken: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
                collateralToken: '0x5979D7b546E38E414F7E9822514be443A4800529',
                oracle: '0x8e02a9b9Cc29d783b2fCB71C3a72651B591cae31',
                irm: '0x66F30587FB8D4206918deb78ecA7d5eBbafD06DA',
                lltv: '860000000000000000',
            },
        },
    ],
};

const supplyToMarket = async (marketParams) => {
    const [wallet] = await hre.ethers.getSigners();
    const morphoBlue = await hre.ethers.getContractAt('IMorphoBlue', MORPHO_BLUE_ADDRESS);
    const loanToken = getAssetInfoByAddress(marketParams[0]);
    const supplyAmount = fetchAmountinUSDPrice(loanToken.symbol, loanTokenSupplyAmountInUsd);
    const supplyAmountInWei = hre.ethers.utils.parseUnits(supplyAmount, loanToken.decimals);
    await setBalance(loanToken.address, wallet.address, supplyAmountInWei);
    await approve(loanToken.address, MORPHO_BLUE_ADDRESS, wallet);
    await morphoBlue.supply(marketParams, supplyAmountInWei, '0', wallet.address, [], {
        gasLimit: 3000000,
    });
};

const deployMorphoBlueCloseBundle = async () => {
    const isFork = isNetworkFork();
    const isL2 = network !== 'mainnet';
    await openStrategyAndBundleStorage(isFork);
    const flCloseToDebtStrategy = isL2
        ? createMorphoBlueFLCloseToDebtL2Strategy()
        : createMorphoBlueFLCloseToDebtStrategy();
    const flCloseToCollStrategy = isL2
        ? createMorphoBlueFLCloseToCollL2Strategy()
        : createMorphoBlueFLCloseToCollStrategy();
    const continuous = false;
    const flCloseToDebtStrategyId = await createStrategy(...flCloseToDebtStrategy, continuous);
    const flCloseToCollStrategyId = await createStrategy(...flCloseToCollStrategy, continuous);
    const bundleId = await createBundle([flCloseToDebtStrategyId, flCloseToCollStrategyId]);
    return bundleId;
};

const formatMarketParams = (marketParams) => [
    marketParams.loanToken,
    marketParams.collateralToken,
    marketParams.oracle,
    marketParams.irm,
    marketParams.lltv,
];

const openMorphoBlueProxyPosition = async (
    proxy,
    eoaAddr,
    marketParams,
    collTokenSymbol,
    collAmountInUsd,
    loanTokenSymbol,
    borrowAmountInUsd,
) => {
    const eoaSigner = await hre.ethers.getSigner(eoaAddr);
    const proxyAddr = proxy.address;

    const collAsset = getAssetInfo(
        collTokenSymbol === 'ETH' ? 'WETH' : collTokenSymbol,
        chainIds[network],
    );
    const debtAsset = getAssetInfo(
        loanTokenSymbol === 'ETH' ? 'WETH' : loanTokenSymbol,
        chainIds[network],
    );

    const collAmount = await fetchAmountInUSDPrice(collAsset.symbol, collAmountInUsd);
    const debtAmount = await fetchAmountInUSDPrice(debtAsset.symbol, borrowAmountInUsd);

    await setBalance(collAsset.address, eoaAddr, collAmount);
    await approve(collAsset.address, proxyAddr, eoaSigner);

    await morphoBlueSupplyCollateral(
        proxy,
        formatMarketParams(marketParams),
        collAmount,
        eoaAddr,
        proxyAddr,
    );
    await morphoBlueBorrow(proxy, formatMarketParams(marketParams), debtAmount, proxyAddr, eoaAddr);
    console.log('MorphoBlueProxyPosition opened');
};

const getMorphoBluePositionRatio = async (marketParams, user) => {
    const view = await hre.ethers.getContractAt(
        'MorphoBlueHelper',
        addrs[network].MORPHO_BLUE_VIEW,
    );
    const ratio = await view.callStatic.getRatioUsingParams(marketParams, user);
    return ratio;
};

const getMorphoBlueUserInfo = async (marketParams, user) => {
    const view = await hre.ethers.getContractAt('MorphoBlueView', addrs[network].MORPHO_BLUE_VIEW);
    const userInfo = await view.callStatic.getUserInfo(marketParams, user);
    return userInfo;
};

module.exports = {
    getMarkets,
    supplyToMarket,
    deployMorphoBlueCloseBundle,
    formatMarketParams,
    openMorphoBlueProxyPosition,
    getMorphoBluePositionRatio,
    getMorphoBlueUserInfo,
    loanTokenSupplyAmountInUsd,
    collateralSupplyAmountInUsd,
    borrowAmountInUsd,
    MORPHO_BLUE_ADDRESS,
    MORPHO_BLUE_AUTOMATION_TEST_PAIRS,
};
