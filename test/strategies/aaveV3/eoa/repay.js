// AaveV3 Repay strategies
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
    callAaveV3GenericRepayStrategy,
    callAaveV3GenericFLRepayStrategy,
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

const IS_BOOST = false;
const RATIO_STATE = 1;

const runRepayTests = () => {
    describe('AaveV3 Repay Strategies Tests', () => {
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
            await redeploy('PullToken', isFork);
            await redeploy('SubProxy', isFork);

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
            triggerRatioRepay,
            targetRatioRepay,
            collAmountInUSD,
            debtAmountInUSD,
            repayAmountInUSD,
            isEOA,
            isFLStrategy,
            marketAddress,
        ) => {
            // Use the passed market address or fall back to default
            const marketAddr = marketAddress || addrs[network].AAVE_MARKET;
            const positionOwner = isEOA ? senderAcc.address : proxy.address;

            // Open position
            if (isEOA) {
                await openAaveV3EOAPosition(
                    senderAcc.address,
                    collAsset.symbol,
                    debtAsset.symbol,
                    collAmountInUSD,
                    debtAmountInUSD,
                    marketAddr,
                );

                // EOA delegates to the actual Smart Wallet address that executes the strategy
                await setupAaveV3EOAPermissions(
                    senderAcc.address,
                    proxy.address, // The actual Smart Wallet executing address
                    collAsset.address,
                    debtAsset.address,
                    marketAddr,
                );
            } else {
                await openAaveV3ProxyPosition(
                    senderAcc.address,
                    proxy,
                    collAsset.symbol,
                    debtAsset.symbol,
                    collAmountInUSD,
                    debtAmountInUSD,
                    marketAddr,
                );
            }

            // Check ratioBefore
            const ratioBefore = await getAaveV3PositionRatio(positionOwner, null, marketAddr);

            // Create subscription based on whether it's EOA or proxy
            const result = await subAaveV3LeverageManagementGeneric(
                proxy,
                senderAcc.address,
                marketAddr,
                RATIO_STATE,
                targetRatioRepay,
                triggerRatioRepay,
                isEOA,
                IS_BOOST,
            );

            const repaySubId = result.subId;
            const strategySub = result.strategySub;

            console.log('SUBBED !!!!');
            console.log('REPAY SUB ID AND SUB DATA!!!!');
            console.log(repaySubId);
            console.log(strategySub);

            const repayAmount = await fetchAmountInUSDPrice(collAsset.symbol, repayAmountInUSD);
            console.log(repayAmount);

            const exchangeObject = await formatMockExchangeObjUsdFeed(
                collAsset,
                debtAsset,
                repayAmount,
                mockWrapper,
            );

            // Execute strategy
            if (isFLStrategy) {
                console.log('Executing FL Boost strategy !!!!');
                await addBalancerFlLiquidity(collAsset.address);
                await addBalancerFlLiquidity(debtAsset.address);

                // TODO -> pass random params like placeholderAddr, to check if piping works
                await callAaveV3GenericFLRepayStrategy(
                    strategyExecutor,
                    1,
                    repaySubId,
                    strategySub,
                    exchangeObject,
                    repayAmount,
                    flAddr,
                    marketAddr,
                );
            } else {
                // TODO -> pass random params like placeholderAddr, to check if piping works
                await callAaveV3GenericRepayStrategy(
                    strategyExecutor,
                    0,
                    repaySubId,
                    strategySub,
                    exchangeObject,
                    repayAmount,
                    marketAddr,
                );
            }

            const ratioAfter = await getAaveV3PositionRatio(positionOwner, null, marketAddr);
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

            // Determine market name based on market address
            const marketName =
                pair.marketAddr === addrs[network].AAVE_MARKET
                    ? 'Aave V3 Core Market'
                    : 'Aave V3 Prime Market';

            it(`... should execute aaveV3 SW repay strategy for ${pair.collSymbol} /
            ${pair.debtSymbol} pair on ${marketName}`, async () => {
                const isEOA = false;
                const isFLStrategy = false;
                await baseTest(
                    collAsset,
                    debtAsset,
                    pair.triggerRatioRepay,
                    pair.targetRatioRepay,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.repayAmountInUSD,
                    isEOA,
                    isFLStrategy,
                    pair.marketAddr,
                );
            });
            it(`... should execute aaveV3 SW FL repay strategy for ${pair.collSymbol} /
            ${pair.debtSymbol} pair on ${marketName}`, async () => {
                const isEOA = false;
                const isFLStrategy = true;
                await baseTest(
                    collAsset,
                    debtAsset,
                    pair.triggerRatioRepay,
                    pair.targetRatioRepay,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.repayAmountInUSD,
                    isEOA,
                    isFLStrategy,
                    pair.marketAddr,
                );
            });
            it(`... should execute aaveV3 EOA repay strategy for ${pair.collSymbol} / ${pair.debtSymbol} pair on ${marketName}`, async () => {
                const isEOA = true;
                const isFLStrategy = false;
                await baseTest(
                    collAsset,
                    debtAsset,
                    pair.triggerRatioRepay,
                    pair.targetRatioRepay,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.repayAmountInUSD,
                    isEOA,
                    isFLStrategy,
                    pair.marketAddr,
                );
            });
            it(`... should execute aaveV3 EOA FL repay strategy for ${pair.collSymbol} / ${pair.debtSymbol} pair on ${marketName}`, async () => {
                const isEOA = true;
                const isFLStrategy = true;
                await baseTest(
                    collAsset,
                    debtAsset,
                    pair.triggerRatioRepay,
                    pair.targetRatioRepay,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.repayAmountInUSD,
                    isEOA,
                    isFLStrategy,
                    pair.marketAddr,
                );
            });
        }
    });
};

module.exports = {
    runRepayTests,
};
