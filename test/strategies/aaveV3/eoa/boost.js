// AaveV3 Boost strategies
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
const { subAaveV3LeverageManagementGeneric } = require('../../utils/strategy-subs');
const {
    callAaveV3GenericBoostStrategy,
    callAaveV3GenericFLBoostStrategy,
} = require('../../utils/strategy-calls');
const {
    AAVE_V3_AUTOMATION_TEST_PAIRS_BOOST,
    openAaveV3ProxyPosition,
    openAaveV3EOAPosition,
    getAaveV3PositionRatio,
    deployAaveV3BoostGenericBundle,
    deployAaveV3RepayGenericBundle,
    setupAaveV3EOAPermissions,
} = require('../../../utils/aave');

const IS_BOOST = true;
const RATIO_STATE = 0;

const runBoostTests = () => {
    describe('AaveV3 Boost Strategies Tests', () => {
        let snapshotId;
        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
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

            await deployAaveV3RepayGenericBundle(true);
            await deployAaveV3BoostGenericBundle(true);
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
            triggerRatioBoost,
            targetRatioBoost,
            collAmountInUSD,
            debtAmountInUSD,
            boostAmountInUSD,
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

            // TODO -> This is default market, should not be hardcoded
            // Get AAVE market address (network and addrs are already imported at top of file)
            const marketAddr = addrs[network].AAVE_MARKET;

            // Create subscription based on whether it's EOA or proxy
            const result = await subAaveV3LeverageManagementGeneric(
                proxy,
                senderAcc.address,
                marketAddr,
                RATIO_STATE, // ratio state for boost !
                targetRatioBoost,
                triggerRatioBoost,
                isEOA,
                IS_BOOST, // is boost
            );
            const boostSubId = result.subId;
            const strategySub = result.strategySub;

            console.log('SUBBED !!!!');

            // console.log('strategySub BOOST  ------->>>>>>>>>> \n', strategySub);
            const boostAmount = await fetchAmountInUSDPrice(debtAsset.symbol, boostAmountInUSD);
            console.log(boostAmount);

            const exchangeObject = await formatMockExchangeObjUsdFeed(
                debtAsset,
                collAsset,
                boostAmount,
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
                await addBalancerFlLiquidity(debtAsset.address);
                await addBalancerFlLiquidity(collAsset.address);

                // TODO -> pass random params like placeholderAddr, to check if piping works
                await callAaveV3GenericFLBoostStrategy(
                    strategyExecutor,
                    1,
                    boostSubId,
                    strategySub,
                    exchangeObject,
                    boostAmount,
                    flAddr,
                    debtAsset.address,
                    collAsset.address,
                );
            } else {
                // TODO -> pass random params like placeholderAddr, to check if piping works
                await callAaveV3GenericBoostStrategy(
                    strategyExecutor,
                    0,
                    boostSubId,
                    strategySub,
                    exchangeObject,
                    boostAmount,
                );
            }

            const ratioAfter = await getAaveV3PositionRatio(positionOwner);
            console.log('ratioAfter', ratioAfter);
            console.log('ratioBefore', ratioBefore);
            expect(ratioAfter).to.be.lt(ratioBefore);
        };

        const testPairs = AAVE_V3_AUTOMATION_TEST_PAIRS_BOOST[chainIds[network]] || [];
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

            it(`... should execute aaveV3 SW boost strategy for ${pair.collSymbol} /
            ${pair.debtSymbol} pair`, async () => {
                const isEOA = false;
                const isFLStrategy = false;
                await baseTest(
                    collAsset,
                    debtAsset,
                    pair.triggerRatioBoost,
                    pair.targetRatioBoost,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.boostAmountInUSD,
                    isEOA,
                    isFLStrategy,
                );
            });
            it(`... should execute aaveV3 SW FL boost strategy for ${pair.collSymbol} /
            ${pair.debtSymbol} pair`, async () => {
                const isEOA = false;
                const isFLStrategy = true;
                await baseTest(
                    collAsset,
                    debtAsset,
                    pair.triggerRatioBoost,
                    pair.targetRatioBoost,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.boostAmountInUSD,
                    isEOA,
                    isFLStrategy,
                );
            });
            it(`... should execute aaveV3 EOA boost strategy for ${pair.collSymbol} / ${pair.debtSymbol} pair`, async () => {
                const isEOA = true;
                const isFLStrategy = false;
                await baseTest(
                    collAsset,
                    debtAsset,
                    pair.triggerRatioBoost,
                    pair.targetRatioBoost,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.boostAmountInUSD,
                    isEOA,
                    isFLStrategy,
                );
            });
            it(`... should execute aaveV3 EOA FL boost strategy for ${pair.collSymbol} / ${pair.debtSymbol} pair`, async () => {
                const isEOA = true;
                const isFLStrategy = true;
                await baseTest(
                    collAsset,
                    debtAsset,
                    pair.triggerRatioBoost,
                    pair.targetRatioBoost,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.boostAmountInUSD,
                    isEOA,
                    isFLStrategy,
                );
            });
        }
    });
};

module.exports = {
    runBoostTests,
};
