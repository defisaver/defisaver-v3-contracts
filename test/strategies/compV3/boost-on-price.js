/* eslint-disable max-len */
const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfo } = require('@defisaver/tokens');
const automationSdk = require('@defisaver/automation-sdk');
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
} = require('../../utils/utils');

const {
    addBotCaller,
} = require('../utils/utils-strategies');
const {
    COMP_V3_AUTOMATION_TEST_PAIRS,
    openCompV3ProxyPosition,
    getCompV3PositionRatio,
    openCompV3EOAPosition,
    addCompV3Manager,
    deployCompV3BoostOnPriceBundle,
} = require('../../utils/compoundV3');
const { subCompV3BoostOnPriceBundle } = require('../utils/strategy-subs');
const { callCompV3BoostOnPriceStrategy, callCompV3FLBoostOnPriceStrategy } = require('../utils/strategy-calls');

const TARGET_RATIO = 175;
const COLL_AMOUNT_IN_USD = '40000';
const DEBT_AMOUNT_IN_USD = '15000';
const BOOST_AMOUNT_IN_USD = '3000';
const PRICE = 1000;

const runBoostOnPriceTests = () => {
    describe('CompV3 Boost On Price Strategies Tests', () => {
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
            await sendEther(senderAcc, addrs[network].OWNER_ACC, '10');
            botAcc = (await hre.ethers.getSigners())[1];
            proxy = await getProxy(senderAcc.address);
            await addBotCaller(botAcc.address, isFork);
            strategyExecutor = (await getStrategyExecutorContract()).connect(botAcc);
            mockWrapper = await getAndSetMockExchangeWrapper(senderAcc);
            const flContract = await getContractFromRegistry('FLAction', isFork);
            flAddr = flContract.address;

            await redeploy('CompV3PriceTrigger', isFork);
            await redeploy('CompV3Borrow', isFork);
            await redeploy('CompV3Payback', isFork);
            await redeploy('CompV3Supply', isFork);
            await redeploy('CompV3Withdraw', isFork);
            await redeploy('CompV3RatioCheck', isFork);

            proxyBundleId = await deployCompV3BoostOnPriceBundle(false);
            eoaBundleId = await deployCompV3BoostOnPriceBundle(true);
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
            isFLStrategy,
        ) => {
            const positionOwner = isEOA ? senderAcc.address : proxy.address;
            if (isEOA) {
                await addCompV3Manager(senderAcc.address, proxy.address, debtAsset.symbol);
                await openCompV3EOAPosition(
                    senderAcc.address,
                    debtAsset.symbol,
                    collAsset.symbol,
                    COLL_AMOUNT_IN_USD,
                    DEBT_AMOUNT_IN_USD,
                );
            } else {
                await openCompV3ProxyPosition(
                    senderAcc.address,
                    proxy,
                    debtAsset.symbol,
                    collAsset.symbol,
                    COLL_AMOUNT_IN_USD,
                    DEBT_AMOUNT_IN_USD,
                );
            }

            const ratioBefore = await getCompV3PositionRatio(debtAsset.symbol, positionOwner);
            console.log('ratioBefore', ratioBefore);

            const bundleId = isEOA ? eoaBundleId : proxyBundleId;

            const { subId, strategySub } = await subCompV3BoostOnPriceBundle(
                proxy,
                senderAcc.address,
                bundleId,
                debtAsset.symbol,
                collAsset.symbol,
                TARGET_RATIO,
                PRICE,
                automationSdk.enums.RatioState.OVER,
                isEOA,
            );

            const boostAmount = await fetchAmountInUSDPrice(debtAsset.symbol, BOOST_AMOUNT_IN_USD);

            const exchangeObject = await formatMockExchangeObjUsdFeed(
                debtAsset,
                collAsset,
                boostAmount,
                mockWrapper,
            );

            if (isFLStrategy) {
                await callCompV3FLBoostOnPriceStrategy(
                    strategyExecutor,
                    1,
                    subId,
                    strategySub,
                    exchangeObject,
                    boostAmount,
                    flAddr,
                    debtAsset.address,
                );
            } else {
                await callCompV3BoostOnPriceStrategy(
                    strategyExecutor,
                    0,
                    subId,
                    strategySub,
                    exchangeObject,
                    boostAmount,
                );
            }

            const ratioAfter = await getCompV3PositionRatio(debtAsset.symbol, positionOwner);
            console.log('ratioAfter', ratioAfter);

            expect(ratioAfter).to.be.lt(ratioBefore);
        };

        for (let i = 0; i < COMP_V3_AUTOMATION_TEST_PAIRS[chainIds[network]].length; ++i) {
            const pair = COMP_V3_AUTOMATION_TEST_PAIRS[chainIds[network]][i];
            const collAsset = getAssetInfo(pair.collSymbol === 'ETH' ? 'WETH' : pair.collSymbol, chainIds[network]);
            const debtAsset = getAssetInfo(pair.debtSymbol === 'ETH' ? 'WETH' : pair.debtSymbol, chainIds[network]);
            it(`... should execute compV3 boost on price strategy for ${pair.collSymbol} / ${pair.debtSymbol} pair`, async () => {
                const isEOA = false;
                const isFLStrategy = false;
                await baseTest(collAsset, debtAsset, isEOA, isFLStrategy);
            });
            it(`... should execute compV3 FL boost on price strategy for ${pair.collSymbol} / ${pair.debtSymbol} pair`, async () => {
                const isEOA = false;
                const isFLStrategy = true;
                await baseTest(collAsset, debtAsset, isEOA, isFLStrategy);
            });
            it(`... should execute compV3 EOA FL boost on price strategy for ${pair.collSymbol} / ${pair.debtSymbol} pair`, async () => {
                const isEOA = true;
                const isFLStrategy = false;
                await baseTest(collAsset, debtAsset, isEOA, isFLStrategy);
            });
            it(`... should execute compV3 EOA boost on price strategy for ${pair.collSymbol} / ${pair.debtSymbol} pair`, async () => {
                const isEOA = true;
                const isFLStrategy = true;
                await baseTest(collAsset, debtAsset, isEOA, isFLStrategy);
            });
        }
    });
};

module.exports = {
    runBoostOnPriceTests,
};
