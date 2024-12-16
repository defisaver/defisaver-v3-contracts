/* eslint-disable max-len */
const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfoByAddress } = require('@defisaver/tokens');
const automationSdk = require('@defisaver/automation-sdk');
const { configure } = require('@defisaver/sdk');

const {
    getProxy,
    setBalance,
    network,
    addrs,
    chainIds,
    takeSnapshot,
    revertToSnapshot,
    isNetworkFork,
    getOwnerAddr,
    fetchAmountInUSDPrice,
    getContractFromRegistry,
    formatExchangeObj,
    openStrategyAndBundleStorage,
    getNetwork,
    redeploy,
    approve,
} = require('../../utils');

const {
    addBotCaller,
    createStrategy,
    createBundle,
} = require('../../utils-strategies');

const { topUp } = require('../../../scripts/utils/fork');
const { subMorphoBlueLeverageManagementOnPrice } = require('../../strategy-subs');
const { createMorphoBlueBoostOnTargetPriceStrategy, createMorphoBlueFLBoostOnTargetPriceStrategy } = require('../../strategies');
const { createMorphoBlueBoostOnTargetPriceL2Strategy, createMorphoBlueFLBoostOnTargetPriceL2Strategy } = require('../../l2-strategies');
const { morphoBlueSupplyCollateral, morphoBlueBorrow } = require('../../actions');
const { callMorphoBlueBoostOnTargetPriceStrategy, callMorphoBlueFLBoostOnTargetPriceStrategy } = require('../../strategy-calls');
const { MORPHO_BLUE_ADDRESS } = require('../../morpho-blue/utils');

/* //////////////////////////////////////////////////////////////
                           CONSTANTS
////////////////////////////////////////////////////////////// */

// We are testing with real sell, without mocking, so use markets with enough uniV3 liquidity.
const L1_MARKETS_WITH_UNI_V3_LIQUIDITY = [
    // wstETH/ETH morpho market
    {
        loanToken: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        collateralToken: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
        oracle: '0x2a01eb9496094da03c4e364def50f5ad1280ad72',
        irm: '0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC',
        lltv: '945000000000000000',
        uniV3Fee: 100,
    },
    // WBTC/USDC morpho market
    {
        loanToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        collateralToken: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
        oracle: '0xDddd770BADd886dF3864029e4B377B5F6a2B6b83',
        irm: '0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC',
        lltv: '860000000000000000',
        uniV3Fee: 3000,
    },
];
const L2_MARKETS_WITH_UNI_V3_LIQUIDITY = [
    // wstETH/ETH morpho market
    {
        loanToken: '0x4200000000000000000000000000000000000006',
        collateralToken: '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452',
        oracle: '0x4A11590e5326138B514E08A9B52202D42077Ca65',
        irm: '0x46415998764C29aB2a25CbeA6254146D50D22687',
        lltv: '945000000000000000',
        uniV3Fee: 100,
    },
    // cbBTC/ETH morpho market
    {
        loanToken: '0x4200000000000000000000000000000000000006',
        collateralToken: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
        oracle: '0x10b95702a0ce895972C91e432C4f7E19811D320E',
        irm: '0x46415998764C29aB2a25CbeA6254146D50D22687',
        lltv: '915000000000000000',
        uniV3Fee: 500,
    },
    // cbBTC/USDC
    {
        loanToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        collateralToken: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
        oracle: '0x663BECd10daE6C4A3Dcd89F1d76c1174199639B9',
        irm: '0x46415998764C29aB2a25CbeA6254146D50D22687',
        lltv: '860000000000000000',
        uniV3Fee: 500,
    },
];
const TEST_MARKETS = network === 'mainnet' ? L1_MARKETS_WITH_UNI_V3_LIQUIDITY : L2_MARKETS_WITH_UNI_V3_LIQUIDITY;

// make initial ratio ~ 200
const COLL_AMOUNT_IN_USD = 10000;
const BORROW_AMOUNT_IN_USD = 5000;

const BOOST_LOAN_AMOUNT_IN_USD = 1500;
// 11500 / 6500 = 1.769
const TARGET_RATIO = 175;

/* //////////////////////////////////////////////////////////////
                            HELPERS
////////////////////////////////////////////////////////////// */

const deployBoostOnPriceBundle = async (isFork) => {
    await openStrategyAndBundleStorage(isFork);
    const boostOnPriceStrategy = getNetwork() === 'mainnet'
        ? createMorphoBlueBoostOnTargetPriceStrategy()
        : createMorphoBlueBoostOnTargetPriceL2Strategy();
    const flBoostOnPriceStrategy = getNetwork() === 'mainnet'
        ? createMorphoBlueFLBoostOnTargetPriceStrategy()
        : createMorphoBlueFLBoostOnTargetPriceL2Strategy();
    const boostOnPriceStrategyId = await createStrategy(undefined, ...boostOnPriceStrategy, false);
    const flBoostOnPriceStrategyId = await createStrategy(undefined, ...flBoostOnPriceStrategy, false);
    const boostOnPriceBundleId = await createBundle(undefined, [boostOnPriceStrategyId, flBoostOnPriceStrategyId]);
    return boostOnPriceBundleId;
};
const formatMarketParams = (marketParams) => [
    marketParams.loanToken,
    marketParams.collateralToken,
    marketParams.oracle,
    marketParams.irm,
    marketParams.lltv,
];
const createPosition = async (
    marketParams,
    loanToken,
    collToken,
    senderAcc,
    proxy,
    user,
) => {
    // give auth for EOA automation
    if (user !== proxy.address) {
        const morphoBlue = await hre.ethers.getContractAt('IMorphoBlue', MORPHO_BLUE_ADDRESS);
        const isAuthorized = await morphoBlue.isAuthorized(senderAcc.address, proxy.address);
        if (!isAuthorized) {
            await morphoBlue.connect(senderAcc).setAuthorization(proxy.address, true);
        }
    }
    const borrowAmount = await fetchAmountInUSDPrice(loanToken.symbol, BORROW_AMOUNT_IN_USD);
    const supplyAmount = await fetchAmountInUSDPrice(collToken.symbol, COLL_AMOUNT_IN_USD);
    await setBalance(collToken.address, senderAcc.address, supplyAmount);
    await approve(collToken.address, proxy.address, senderAcc);
    await morphoBlueSupplyCollateral(
        proxy,
        formatMarketParams(marketParams),
        supplyAmount,
        senderAcc.address,
        user,
    );
    await morphoBlueBorrow(
        proxy,
        formatMarketParams(marketParams),
        borrowAmount,
        user,
        senderAcc.address,
    );
};
const calculateMorphoPrice = async (loanToken, collToken, oracle) => {
    const oracleContract = await hre.ethers.getContractAt('IOracle', oracle);
    const price = await oracleContract.price();
    const pricePrecision = hre.ethers.BigNumber.from(10).pow(8);
    const oracleDecimals = 36;
    const currentPrice = price
        .mul(pricePrecision)
        .div(
            hre.ethers.BigNumber.from(10).pow(oracleDecimals + loanToken.decimals - collToken.decimals),
        );
    return currentPrice.div(pricePrecision);
};
const formatExchangeObjForMarket = (marketParams, amount) => formatExchangeObj(
    marketParams.loanToken,
    marketParams.collateralToken,
    amount,
    addrs[network].UNISWAP_V3_WRAPPER,
    0,
    marketParams.uniV3Fee,
);

/* //////////////////////////////////////////////////////////////
                              TEST
////////////////////////////////////////////////////////////// */

const morphoBoostOnPriceStrategyTest = async (isFork, eoaBoost) => {
    describe('Morpho Boost On Price Strategy Test', function () {
        this.timeout(1200000);
        const REGISTRY_ADDR = addrs[network].REGISTRY_ADDR;
        let snapshotId;
        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let flAction;
        let view;
        let boostOnPriceBundleId;
        let user;

        before(async () => {
            if (network !== 'mainnet') {
                configure({
                    chainId: 8453,
                    testMode: true,
                });
            }
            // setup callers
            [senderAcc, botAcc] = await hre.ethers.getSigners();
            if (isFork) {
                await topUp(senderAcc.address);
                await topUp(botAcc.address);
                await topUp(getOwnerAddr());
            }
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
            user = eoaBoost ? senderAcc.address : proxy.address;

            // setup contracts
            const strategyContractName = network === 'mainnet' ? 'StrategyExecutor' : 'StrategyExecutorL2';
            strategyExecutor = await hre.ethers.getContractAt(strategyContractName, addrs[getNetwork()].STRATEGY_EXECUTOR_ADDR);
            strategyExecutor = strategyExecutor.connect(botAcc);
            flAction = await getContractFromRegistry('FLAction', REGISTRY_ADDR, false, isFork);
            view = await hre.ethers.getContractAt('MorphoBlueHelper', addrs[getNetwork()].MORPHO_BLUE_VIEW);
            await redeploy('MorphoBluePriceTrigger', REGISTRY_ADDR, false, isFork);
            await redeploy('MorphoBlueTargetRatioCheck', REGISTRY_ADDR, false, isFork);

            // deploy bundle
            boostOnPriceBundleId = await deployBoostOnPriceBundle(isFork);

            // add bot caller
            await addBotCaller(botAcc.address, REGISTRY_ADDR, isFork);
        });
        beforeEach(async () => { snapshotId = await takeSnapshot(); });
        afterEach(async () => { await revertToSnapshot(snapshotId); });

        for (let i = 0; i < TEST_MARKETS.length; i++) {
            const marketParams = TEST_MARKETS[i];
            const loanToken = getAssetInfoByAddress(marketParams.loanToken, chainIds[network]);
            const collToken = getAssetInfoByAddress(marketParams.collateralToken, chainIds[network]);

            it(`... should call regular Morpho blue boost on price strategy for ${eoaBoost ? 'EOA' : 'wallet'} position: [${collToken.symbol}/${loanToken.symbol}]`, async () => {
                // 1. create position
                await createPosition(marketParams, loanToken, collToken, senderAcc, proxy, user);

                // // 2. take snapshot of ratio before
                const ratioBefore = await view.callStatic.getRatioUsingParams(marketParams, user);

                // 3. calculate trigger price
                const price = await calculateMorphoPrice(loanToken, collToken, marketParams.oracle);
                const triggerPrice = price.mul(2);

                // 4. subscribe to strategy
                const { subId, strategySub } = await subMorphoBlueLeverageManagementOnPrice(
                    proxy,
                    boostOnPriceBundleId,
                    marketParams,
                    user,
                    TARGET_RATIO,
                    triggerPrice,
                    automationSdk.enums.RatioState.UNDER,
                );

                // 5. calculate boost amount
                const boostAmount = await fetchAmountInUSDPrice(loanToken.symbol, BOOST_LOAN_AMOUNT_IN_USD);

                // 6. create exchange order
                const exchangeOrder = formatExchangeObjForMarket(marketParams, boostAmount);

                // 7. call strategy
                const strategyIndex = 0;
                await callMorphoBlueBoostOnTargetPriceStrategy(
                    strategyExecutor,
                    strategyIndex,
                    subId,
                    strategySub,
                    boostAmount,
                    exchangeOrder,
                );

                // 8. check ratio after
                const ratioAfter = await view.callStatic.getRatioUsingParams(marketParams, user);
                expect(ratioAfter).to.be.lt(ratioBefore);
            });
            it(`... should call flash loan Morpho blue boost on price strategy for ${eoaBoost ? 'EOA' : 'wallet'} position: [${collToken.symbol}/${loanToken.symbol}]`, async () => {
                // 1. create position
                await createPosition(marketParams, loanToken, collToken, senderAcc, proxy, user);

                // 2. take snapshot of ratio before
                const ratioBefore = await view.callStatic.getRatioUsingParams(marketParams, user);

                // 3. calculate trigger price
                const price = await calculateMorphoPrice(loanToken, collToken, marketParams.oracle);
                const triggerPrice = price.mul(2);

                // 4. subscribe to strategy
                const { subId, strategySub } = await subMorphoBlueLeverageManagementOnPrice(
                    proxy,
                    boostOnPriceBundleId,
                    marketParams,
                    user,
                    TARGET_RATIO,
                    triggerPrice,
                    automationSdk.enums.RatioState.UNDER,
                );

                // 5. calculate boost amount
                const boostAmount = await fetchAmountInUSDPrice(loanToken.symbol, BOOST_LOAN_AMOUNT_IN_USD);

                // 6. create exchange order
                const exchangeOrder = formatExchangeObjForMarket(marketParams, boostAmount);

                // 7. call strategy
                const strategyIndex = 1;
                await callMorphoBlueFLBoostOnTargetPriceStrategy(
                    strategyExecutor,
                    strategyIndex,
                    subId,
                    strategySub,
                    boostAmount,
                    exchangeOrder,
                    loanToken.address,
                    flAction.address,
                );

                // 8. check ratio after
                const ratioAfter = await view.callStatic.getRatioUsingParams(marketParams, user);
                expect(ratioAfter).to.be.lt(ratioBefore);
            });
        }
    });
};

describe('Morpho Boost On Price Strategy Test', function () {
    this.timeout(80000);
    it('... test morpho boost on price strategies', async () => {
        await morphoBoostOnPriceStrategyTest(isNetworkFork(), false);
        await morphoBoostOnPriceStrategyTest(isNetworkFork(), true);
    }).timeout(50000);
});

module.exports = {
    morphoBoostOnPriceStrategyTest,
};
