/* eslint-disable max-len */
const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfo } = require('@defisaver/tokens');
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
    deployCompV3RepayBundle,
    deployCompV3BoostBundle,
} = require('../../utils/compoundV3');
const { subCompV3LeverageManagement } = require('../utils/strategy-subs');
const { callCompV3BoostStrategy, callCompV3FLBoostStrategy } = require('../utils/strategy-calls');

const TRIGGER_REPAY_RATIO = 120;
const TRIGGER_BOOST_RATIO = 200;
const TARGET_RATIO_BOOST = 180;
const TARGET_RATIO_REPAY = 150;
const COLL_AMOUNT_IN_USD = '40000';
const DEBT_AMOUNT_IN_USD = '15000';
const BOOST_AMOUNT_IN_USD = '5000';
const BOOST_ENABLED = true;

const runBoostTests = () => {
    describe('CompV3 Boost Strategies Tests', () => {
        let snapshotId;
        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let subProxyContract;
        let mockWrapper;
        let flAddr;

        before(async () => {
            const isFork = isNetworkFork();
            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc = (await hre.ethers.getSigners())[1];
            proxy = await getProxy(senderAcc.address);
            await addBotCaller(botAcc.address, isFork);
            strategyExecutor = (await getStrategyExecutorContract()).connect(botAcc);
            mockWrapper = await getAndSetMockExchangeWrapper(senderAcc);
            const flContract = await getContractFromRegistry('FLAction', isFork);
            flAddr = flContract.address;

            await redeploy('CompV3RatioTrigger', isFork);
            await redeploy('CompV3Borrow', isFork);
            await redeploy('CompV3Payback', isFork);
            await redeploy('CompV3Supply', isFork);
            await redeploy('CompV3Withdraw', isFork);
            await redeploy('CompV3RatioCheck', isFork);

            if (network !== 'mainnet') {
                /// @dev At the time of testing, regular repay and boost bundles are already live and deployed on L2s (arbitrum & base).
                /// We only want to test new EOA bundles deployment. For that we need new CompV3SubProxyL2 contract with new bundle ids.
                const existingRepayBundleId = 4;
                const existingBoostBundleId = 5;
                const newEoaBoostBundleId = await deployCompV3BoostBundle(true);
                const newEoaRepayBundleId = await deployCompV3RepayBundle(true);
                subProxyContract = await redeploy(
                    'CompV3SubProxyL2',
                    isFork,
                    existingRepayBundleId,
                    existingBoostBundleId,
                    newEoaRepayBundleId,
                    newEoaBoostBundleId,
                );
            } else {
                /// @dev On mainnet, all bundles are already deployed, including EOA bundles, so here we just test the live state
                subProxyContract = await hre.ethers.getContractAt('CompV3SubProxy', addrs.mainnet.COMP_V3_SUB_PROXY_ADDR);
            }
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

            const { subData, boostSubId } = await subCompV3LeverageManagement(
                proxy,
                debtAsset.symbol,
                TRIGGER_REPAY_RATIO,
                TRIGGER_BOOST_RATIO,
                TARGET_RATIO_BOOST,
                TARGET_RATIO_REPAY,
                BOOST_ENABLED,
                isEOA,
                subProxyContract.address,
            );

            const strategySub = await subProxyContract.formatBoostSub(
                subData,
                proxy.address,
                senderAcc.address,
            );

            const boostAmount = await fetchAmountInUSDPrice(debtAsset.symbol, BOOST_AMOUNT_IN_USD);

            const exchangeObject = await formatMockExchangeObjUsdFeed(
                debtAsset,
                collAsset,
                boostAmount,
                mockWrapper,
            );

            if (isFLStrategy) {
                await callCompV3FLBoostStrategy(
                    strategyExecutor,
                    1,
                    boostSubId,
                    strategySub,
                    exchangeObject,
                    boostAmount,
                    flAddr,
                    debtAsset.address,
                    collAsset.address,
                    positionOwner,
                );
            } else {
                console.log('boostSubId', boostSubId);
                console.log('strategySub', strategySub);
                await callCompV3BoostStrategy(
                    strategyExecutor,
                    0,
                    boostSubId,
                    strategySub,
                    exchangeObject,
                    boostAmount,
                    collAsset.address,
                    positionOwner,
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
            it(`... should execute compV3 boost strategy for ${pair.collSymbol} / ${pair.debtSymbol} pair`, async () => {
                const isEOA = false;
                const isFLStrategy = false;
                await baseTest(collAsset, debtAsset, isEOA, isFLStrategy);
            });
            it(`... should execute compV3 FL boost strategy for ${pair.collSymbol} / ${pair.debtSymbol} pair`, async () => {
                const isEOA = false;
                const isFLStrategy = true;
                await baseTest(collAsset, debtAsset, isEOA, isFLStrategy);
            });
            it(`... should execute compV3 EOA FL boost strategy for ${pair.collSymbol} / ${pair.debtSymbol} pair`, async () => {
                const isEOA = true;
                const isFLStrategy = false;
                await baseTest(collAsset, debtAsset, isEOA, isFLStrategy);
            });
            it(`... should execute compV3 EOA boost strategy for ${pair.collSymbol} / ${pair.debtSymbol} pair`, async () => {
                const isEOA = true;
                const isFLStrategy = true;
                await baseTest(collAsset, debtAsset, isEOA, isFLStrategy);
            });
        }
    });
};

module.exports = {
    runBoostTests,
};
