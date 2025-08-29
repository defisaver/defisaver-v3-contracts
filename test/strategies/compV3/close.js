/* eslint-disable no-mixed-operators */
/* eslint-disable max-len */
const hre = require("hardhat");
const { expect } = require("chai");
const { getAssetInfo } = require("@defisaver/tokens");
const automationSdk = require("@defisaver/automation-sdk");
const {
    getProxy,
    network,
    addrs,
    takeSnapshot,
    revertToSnapshot,
    chainIds,
    getStrategyExecutorContract,
    getAndSetMockExchangeWrapper,
    formatMockExchangeObjUsdFeed,
    fetchAmountInUSDPrice,
    getContractFromRegistry,
    isNetworkFork,
    redeploy,
    sendEther,
    balanceOf,
    addBalancerFlLiquidity,
} = require("../../utils/utils");

const { addBotCaller } = require("../utils/utils-strategies");
const {
    COMP_V3_AUTOMATION_TEST_PAIRS,
    openCompV3ProxyPosition,
    openCompV3EOAPosition,
    addCompV3Manager,
    deployCompV3CloseBundle,
    COMP_V3_MARKETS,
} = require("../../utils/compoundV3");
const { subCompV3CloseOnPriceBundle } = require("../utils/strategy-subs");
const {
    callCompV3FLCloseToDebtStrategy,
    callCompV3FLCloseToCollStrategy,
} = require("../utils/strategy-calls");

const COLL_AMOUNT_IN_USD = "40000";
const DEBT_AMOUNT_IN_USD = "15000";
const TAKE_PROFIT_PRICE = 1; // only for testing purposes to make sure it is always triggered for take profit (over)
const STOP_LOSS_PRICE = 1_000_000; // only for testing purposes to make sure it is always triggered for stop loss (under)

const runCloseTests = () => {
    describe("CompV3 Close Strategies Tests", () => {
        let snapshotId;
        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let mockWrapper;
        let flAddr;
        let proxyBundleId;
        let eoaBundleId;

        before(async () => {
            const isFork = isNetworkFork();
            senderAcc = (await hre.ethers.getSigners())[0];
            await sendEther(senderAcc, addrs[network].OWNER_ACC, "10");
            botAcc = (await hre.ethers.getSigners())[1];
            proxy = await getProxy(senderAcc.address);
            await addBotCaller(botAcc.address, isFork);
            strategyExecutor = (await getStrategyExecutorContract()).connect(botAcc);
            mockWrapper = await getAndSetMockExchangeWrapper(senderAcc);
            const flContract = await getContractFromRegistry("FLAction", isFork);
            flAddr = flContract.address;
            await redeploy("CompV3PriceRangeTrigger", isFork);
            await redeploy("CompV3Payback", isFork);
            await redeploy("CompV3Withdraw", isFork);

            proxyBundleId = await deployCompV3CloseBundle();
            eoaBundleId = await deployCompV3CloseBundle();
        });
        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });
        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        const baseTest = async (
            collAsset,
            debtAsset,
            isEOA,
            closeToDebt,
            stopLossPrice,
            takeProfitPrice,
            stopLossType,
            takeProfitType
        ) => {
            if (isEOA) {
                await addCompV3Manager(senderAcc.address, proxy.address, debtAsset.symbol);
                await openCompV3EOAPosition(
                    senderAcc.address,
                    debtAsset.symbol,
                    collAsset.symbol,
                    COLL_AMOUNT_IN_USD,
                    DEBT_AMOUNT_IN_USD
                );
            } else {
                await openCompV3ProxyPosition(
                    senderAcc.address,
                    proxy,
                    debtAsset.symbol,
                    collAsset.symbol,
                    COLL_AMOUNT_IN_USD,
                    DEBT_AMOUNT_IN_USD
                );
            }

            const bundleId = isEOA ? eoaBundleId : proxyBundleId;

            const { subId, strategySub } = await subCompV3CloseOnPriceBundle(
                proxy,
                bundleId,
                debtAsset.symbol,
                collAsset.symbol,
                stopLossPrice,
                takeProfitPrice,
                stopLossType,
                takeProfitType,
                isEOA ? senderAcc.address : proxy.address
            );

            await addBalancerFlLiquidity(debtAsset.address);
            await addBalancerFlLiquidity(collAsset.address);

            if (closeToDebt) {
                const sellAmount = await fetchAmountInUSDPrice(
                    collAsset.symbol,
                    COLL_AMOUNT_IN_USD
                );
                const exchangeObject = await formatMockExchangeObjUsdFeed(
                    collAsset,
                    debtAsset,
                    sellAmount,
                    mockWrapper
                );
                const flAmount = (await fetchAmountInUSDPrice(debtAsset.symbol, DEBT_AMOUNT_IN_USD))
                    .mul(hre.ethers.BigNumber.from(100))
                    .div(hre.ethers.BigNumber.from(99));
                await callCompV3FLCloseToDebtStrategy(
                    strategyExecutor,
                    0,
                    subId,
                    strategySub,
                    exchangeObject,
                    flAmount,
                    flAddr,
                    debtAsset.address
                );
            } else {
                const flAmount = (await fetchAmountInUSDPrice(collAsset.symbol, DEBT_AMOUNT_IN_USD))
                    .mul(hre.ethers.BigNumber.from(100))
                    .div(hre.ethers.BigNumber.from(99));
                const exchangeObject = await formatMockExchangeObjUsdFeed(
                    collAsset,
                    debtAsset,
                    flAmount,
                    mockWrapper
                );
                await callCompV3FLCloseToCollStrategy(
                    strategyExecutor,
                    1,
                    subId,
                    strategySub,
                    exchangeObject,
                    flAmount,
                    flAddr,
                    collAsset.address
                );
            }

            const positionOwner = isEOA ? senderAcc.address : proxy.address;
            const compV3View = await redeploy("CompV3View", isNetworkFork());
            const marketAddr = COMP_V3_MARKETS[chainIds[network]][debtAsset.symbol];
            const loanDataAfter = await compV3View.getLoanData(marketAddr, positionOwner);
            const proxyCollateralBalance = await balanceOf(collAsset.address, proxy.address);
            const proxyDebtBalance = await balanceOf(debtAsset.address, proxy.address);

            expect(loanDataAfter.borrowValue).to.be.eq(0);
            expect(loanDataAfter.collValue).to.be.eq(0);
            expect(proxyCollateralBalance).to.be.eq(0);
            expect(proxyDebtBalance).to.be.eq(0);
        };

        for (let i = 0; i < COMP_V3_AUTOMATION_TEST_PAIRS[chainIds[network]].length; ++i) {
            const pair = COMP_V3_AUTOMATION_TEST_PAIRS[chainIds[network]][i];
            const collAsset = getAssetInfo(
                pair.collSymbol === "ETH" ? "WETH" : pair.collSymbol,
                chainIds[network]
            );
            const debtAsset = getAssetInfo(
                pair.debtSymbol === "ETH" ? "WETH" : pair.debtSymbol,
                chainIds[network]
            );
            it(`... should execute compV3 FL close to debt strategy for ${pair.collSymbol} / ${pair.debtSymbol} pair`, async () => {
                const isEOA = false;
                const closeToDebt = true;
                const stopLossPrice = STOP_LOSS_PRICE;
                const takeProfitPrice = 0; // not set
                const stopLossType = automationSdk.enums.CloseStrategyType.STOP_LOSS_IN_DEBT;
                const takeProfitType = 0; // not set
                await baseTest(
                    collAsset,
                    debtAsset,
                    isEOA,
                    closeToDebt,
                    stopLossPrice,
                    takeProfitPrice,
                    stopLossType,
                    takeProfitType
                );
            });
            it(`... should execute compV3 FL close to coll strategy for ${pair.collSymbol} / ${pair.debtSymbol} pair`, async () => {
                const isEOA = false;
                const closeToDebt = false;
                const stopLossPrice = 0; // not set
                const takeProfitPrice = TAKE_PROFIT_PRICE;
                const stopLossType = 0; // not set
                const takeProfitType =
                    automationSdk.enums.CloseStrategyType.TAKE_PROFIT_IN_COLLATERAL;
                await baseTest(
                    collAsset,
                    debtAsset,
                    isEOA,
                    closeToDebt,
                    stopLossPrice,
                    takeProfitPrice,
                    stopLossType,
                    takeProfitType
                );
            });
            it(`... should execute compV3 EOA FL close to debt strategy for ${pair.collSymbol} / ${pair.debtSymbol} pair`, async () => {
                const isEOA = true;
                const closeToDebt = true;
                const stopLossPrice = STOP_LOSS_PRICE;
                const takeProfitPrice = TAKE_PROFIT_PRICE;
                const stopLossType = automationSdk.enums.CloseStrategyType.STOP_LOSS_IN_DEBT;
                const takeProfitType = automationSdk.enums.CloseStrategyType.TAKE_PROFIT_IN_DEBT;
                await baseTest(
                    collAsset,
                    debtAsset,
                    isEOA,
                    closeToDebt,
                    stopLossPrice,
                    takeProfitPrice,
                    stopLossType,
                    takeProfitType
                );
            });
            it(`... should execute compV3 EOA FL close to coll strategy for ${pair.collSymbol} / ${pair.debtSymbol} pair`, async () => {
                const isEOA = true;
                const closeToDebt = false;
                const stopLossPrice = STOP_LOSS_PRICE;
                const takeProfitPrice = TAKE_PROFIT_PRICE;
                const stopLossType = automationSdk.enums.CloseStrategyType.STOP_LOSS_IN_COLLATERAL;
                const takeProfitType =
                    automationSdk.enums.CloseStrategyType.TAKE_PROFIT_IN_COLLATERAL;
                await baseTest(
                    collAsset,
                    debtAsset,
                    isEOA,
                    closeToDebt,
                    stopLossPrice,
                    takeProfitPrice,
                    stopLossType,
                    takeProfitType
                );
            });
        }
    });
};

module.exports = {
    runCloseTests,
};
