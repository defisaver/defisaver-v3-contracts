// AaveV3 EOA Boost strategies
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
    getContractFromRegistry,
    getStrategyExecutorContract,
    getAndSetMockExchangeWrapper,
    formatMockExchangeObjUsdFeed,
    fetchAmountInUSDPrice,
    isNetworkFork,
    redeploy,
    sendEther,
    addBalancerFlLiquidity,
} = require('../../../utils/utils');

const { addBotCaller } = require('../../utils/utils-strategies');
const { subAaveV3AutomationStrategyGeneric } = require('../../utils/strategy-subs');
const {
    callAaveV3EOARepayStrategy,
    callAaveV3EOAFLRepayStrategy,
} = require('../../utils/strategy-calls');
const {
    AAVE_V3_AUTOMATION_TEST_PAIRS_REPAY,
    openAaveV3ProxyPosition,
    openAaveV3EOAPosition,
    getAaveV3PositionRatio,
    deployAaveV3BoostGenericBundle,
    deployAaveV3RepayGenericBundle,
    setupAaveV3EOAPermissions,
} = require('../../../utils/aave');

const BOOST_ENABLED = false;

const runEOARepayTests = () => {
    describe('AaveV3 EOA Repay Strategies Tests', () => {
        let snapshotId;
        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let subProxyContract;
        let mockWrapper;
        let flAddr;

        before(async () => {
            // Setup
            const isFork = isNetworkFork();
            await hre.network.provider.send('hardhat_setNextBlockBaseFeePerGas', ['0x0']);

            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc = (await hre.ethers.getSigners())[1];
            await sendEther(senderAcc, addrs[network].OWNER_ACC, '10');
            proxy = await getProxy(senderAcc.address);
            await addBotCaller(botAcc.address, isFork);
            strategyExecutor = (await getStrategyExecutorContract()).connect(botAcc);
            mockWrapper = await getAndSetMockExchangeWrapper(senderAcc);

            const flContract = await getContractFromRegistry('FLAction', isFork);
            flAddr = flContract.address;

            // Redeploys
            await redeploy('AaveV3RatioTrigger', isFork);
            await redeploy('AaveV3Borrow', isFork);
            await redeploy('AaveV3Payback', isFork);
            await redeploy('AaveV3Supply', isFork);
            await redeploy('AaveV3Withdraw', isFork);
            await redeploy('AaveV3RatioCheck', isFork);
            await redeploy('AaveV3OpenRatioCheck', isFork);
            await redeploy('AaveV3View', isFork);

            const newRepayBundleId = await deployAaveV3RepayGenericBundle(true);
            const newBoostBundleId = await deployAaveV3BoostGenericBundle(true);
            subProxyContract = await redeploy(
                'AaveV3SubProxyV2',
                isFork,
                newRepayBundleId,
                newBoostBundleId,
            );
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
            triggerRatioRepay,
            triggerRatioBoost,
            targetRatioRepay,
            targetRatioBoost,
            collAmountInUSD,
            debtAmountInUSD,
            repayAmountInUSD,
            isEOA,
            isFLStrategy,
        ) => {
            const positionOwner = isEOA ? senderAcc.address : proxy.address;
            // Open position
            if (isEOA) {
                await openAaveV3EOAPosition(
                    senderAcc.address,
                    collAsset.symbol,
                    debtAsset.symbol,
                    collAmountInUSD,
                    debtAmountInUSD,
                );

                // EOA delegates to the actual Smart Wallet address that executes the strategy
                await setupAaveV3EOAPermissions(
                    senderAcc.address,
                    proxy.address, // The actual Smart Wallet executing address
                    collAsset.address,
                    debtAsset.address,
                );
            } else {
                await openAaveV3ProxyPosition(
                    senderAcc.address,
                    proxy,
                    collAsset.symbol,
                    debtAsset.symbol,
                    collAmountInUSD,
                    debtAmountInUSD,
                );
            }

            // Check ratioBefore
            const ratioBefore = await getAaveV3PositionRatio(positionOwner);
            console.log('ratioBefore', ratioBefore);
            console.log('ratioBefore', ratioBefore);
            console.log('ratioBefore', ratioBefore);
            console.log('ratioBefore', ratioBefore);
            console.log('ratioBefore', ratioBefore);
            console.log('ratioBefore', ratioBefore);
            console.log('ratioBefore', ratioBefore);
            console.log('ratioBefore', ratioBefore);
            console.log('ratioBefore', ratioBefore);
            console.log('ratioBefore', ratioBefore);

            // Create subscription based on whether it's EOA or proxy
            let subData;
            let repaySubId;
            if (isEOA) {
                const result = await subAaveV3AutomationStrategyGeneric(
                    proxy,
                    triggerRatioRepay,
                    triggerRatioBoost,
                    targetRatioRepay,
                    targetRatioBoost,
                    BOOST_ENABLED,
                    senderAcc.address,
                    true,
                );
                repaySubId = result.repaySubId;
                subData = result.subData;
            } else {
                console.log('SUBBING TO AAVE PROXY !!!!');
                const result = await subAaveV3AutomationStrategyGeneric(
                    proxy,
                    triggerRatioRepay,
                    triggerRatioBoost,
                    targetRatioRepay,
                    targetRatioBoost,
                    BOOST_ENABLED,
                    senderAcc.address,
                    false,
                );
                repaySubId = result.repaySubId;
                subData = result.subData;
            }

            // TODO -> Seems like this is not ok ??
            console.log('SUBBED !!!!');
            console.log('SUBBED !!!!');
            console.log('SUBBED !!!!');
            console.log('SUBBED !!!!');
            console.log('SUBBED !!!!');
            console.log('SUBBED !!!!');
            console.log('REPAY SUB ID AND SUB DATA!!!!');
            console.log(repaySubId);
            console.log(subData);
            // Get sub info
            const subDataInStruct = await subProxyContract.parseSubData(subData);
            // console.log('subDataInStruct ---------->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
            // console.log(subDataInStruct);

            const strategySub = await subProxyContract.formatRepaySub(
                subDataInStruct,
                proxy.address,
                senderAcc.address,
            );

            console.log('strategySub REPAY  ------->>>>>>>>>> \n', strategySub);
            const repayAmount = await fetchAmountInUSDPrice(collAsset.symbol, repayAmountInUSD);
            console.log(repayAmount);

            const exchangeObject = await formatMockExchangeObjUsdFeed(
                collAsset,
                debtAsset,
                repayAmount,
                mockWrapper,
            );

            // console.log('exchangeObject !!!!!');
            // console.log('exchangeObject !!!!!');
            // console.log('exchangeObject !!!!!');
            // console.log('exchangeObject !!!!!');
            // console.log(exchangeObject);

            // Execute strategy
            if (isFLStrategy) {
                console.log('Executing FL Boost strategy !!!!');
                await addBalancerFlLiquidity(collAsset.address);
                await addBalancerFlLiquidity(debtAsset.address);

                // TODO -> pass random params like placeholderAddr, to check if piping works
                await callAaveV3EOAFLRepayStrategy(
                    strategyExecutor,
                    1,
                    repaySubId,
                    strategySub,
                    exchangeObject,
                    repayAmount,
                    flAddr,
                );
            } else {
                // TODO -> pass random params like placeholderAddr, to check if piping works
                await callAaveV3EOARepayStrategy(
                    strategyExecutor,
                    0,
                    repaySubId,
                    strategySub,
                    exchangeObject,
                    repayAmount,
                );
            }

            const ratioAfter = await getAaveV3PositionRatio(positionOwner);
            console.log('ratioAfter', ratioAfter);
            console.log('ratioBefore', ratioBefore);
            expect(ratioAfter).to.be.gt(ratioBefore);
        };

        const testPairs = AAVE_V3_AUTOMATION_TEST_PAIRS_REPAY[chainIds[network]] || [];
        for (let i = 0; i < testPairs.length; ++i) {
            const pair = testPairs[i];
            const collAsset = getAssetInfo(
                pair.collSymbol === 'ETH' ? 'WETH' : pair.collSymbol,
                chainIds[network],
            );
            const debtAsset = getAssetInfo(
                pair.debtSymbol === 'ETH' ? 'WETH' : pair.debtSymbol,
                chainIds[network],
            );

            it(`... should execute aaveV3 SW repay strategy for ${pair.collSymbol} /
            ${pair.debtSymbol} pair`, async () => {
                const isEOA = false;
                const isFLStrategy = false;
                await baseTest(
                    collAsset,
                    debtAsset,
                    pair.triggerRatioRepay,
                    pair.triggerRatioBoost,
                    pair.targetRatioRepay,
                    pair.targetRatioBoost,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.repayAmountInUSD,
                    isEOA,
                    isFLStrategy,
                );
            });
            it(`... should execute aaveV3 SW FL repay strategy for ${pair.collSymbol} /
            ${pair.debtSymbol} pair`, async () => {
                const isEOA = false;
                const isFLStrategy = true;
                await baseTest(
                    collAsset,
                    debtAsset,
                    pair.triggerRatioRepay,
                    pair.triggerRatioBoost,
                    pair.targetRatioRepay,
                    pair.targetRatioBoost,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.repayAmountInUSD,
                    isEOA,
                    isFLStrategy,
                );
            });
            // TODO -> Should probably give proper allowances for this to work
            // it(`... should execute aaveV3 EOA repay strategy for ${pair.collSymbol} / ${pair.debtSymbol} pair`, async () => {
            //     const isEOA = true;
            //     const isFLStrategy = false;
            //     await baseTest(
            //         collAsset,
            //         debtAsset,
            //         pair.triggerRatioRepay,
            //         pair.triggerRatioBoost,
            //         pair.targetRatioRepay,
            //         pair.targetRatioBoost,
            //         pair.collAmountInUSD,
            //         pair.debtAmountInUSD,
            //         pair.repayAmountInUSD,
            //         isEOA,
            //         isFLStrategy,
            //     );
            // });
            // it(`... should execute aaveV3 EOA FL repay strategy for ${pair.collSymbol} / ${pair.debtSymbol} pair`, async () => {
            //     const isEOA = true;
            //     const isFLStrategy = true;
            //     await baseTest(
            //         collAsset,
            //         debtAsset,
            //         pair.triggerRatioRepay,
            //         pair.triggerRatioBoost,
            //         pair.targetRatioRepay,
            //         pair.targetRatioBoost,
            //         pair.collAmountInUSD,
            //         pair.debtAmountInUSD,
            //         pair.repayAmountInUSD,
            //         isEOA,
            //         isFLStrategy,
            //     );
            // });
        }
    });
};

module.exports = {
    runEOARepayTests,
};
