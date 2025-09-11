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
    placeHolderAddr,
} = require('../../../utils/utils');

const { addBotCaller } = require('../../utils/utils-strategies');
const {
    subAaveV3EOAAutomationStrategy,
    subAaveV3AutomationStrategyGeneric,
} = require('../../utils/strategy-subs');
const {
    callAaveV3EOABoostStrategy,
    callAaveV3EOAFLBoostStrategy,
} = require('../../utils/strategy-calls');
const {
    AAVE_V3_AUTOMATION_TEST_PAIRS,
    openAaveV3ProxyPosition,
    openAaveV3EOAPosition,
    getAaveV3PositionRatio,
    deployAaveV3BoostGenericBundle,
    deployAaveV3RepayGenericBundle,
    setupAaveV3EOAPermissions,
} = require('../../../utils/aave');

const TRIGGER_REPAY_RATIO = 120;
const TRIGGER_BOOST_RATIO = 200;
const TARGET_RATIO_BOOST = 180;
const TARGET_RATIO_REPAY = 150;
const COLL_AMOUNT_IN_USD = '40000';
const DEBT_AMOUNT_IN_USD = '15000';
const BOOST_AMOUNT_IN_USD = '5000';
const BOOST_ENABLED = true;

const runEOABoostTests = () => {
    describe('AaveV3 EOA Boost Strategies Tests', () => {
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

        const baseTest = async (collAsset, debtAsset, isEOA, isFLStrategy) => {
            const positionOwner = isEOA ? senderAcc.address : proxy.address;
            // Open position
            // TODO -> refactor this to work for both EOA and proxy
            if (isEOA) {
                await openAaveV3EOAPosition(
                    senderAcc.address,
                    collAsset.symbol,
                    debtAsset.symbol,
                    COLL_AMOUNT_IN_USD,
                    DEBT_AMOUNT_IN_USD,
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
                    COLL_AMOUNT_IN_USD,
                    DEBT_AMOUNT_IN_USD,
                );
            }

            // Check ratioBefore
            const ratioBefore = await getAaveV3PositionRatio(positionOwner);
            console.log('ratioBefore', ratioBefore);

            // Create subscription based on whether it's EOA or proxy
            // TODO -> refactor this to work for both EOA and proxy
            let subData;
            let boostSubId;
            if (isEOA) {
                const result = await subAaveV3AutomationStrategyGeneric(
                    proxy,
                    TRIGGER_REPAY_RATIO,
                    TRIGGER_BOOST_RATIO,
                    TARGET_RATIO_BOOST,
                    TARGET_RATIO_REPAY,
                    BOOST_ENABLED,
                    senderAcc.address,
                    true,
                );
                boostSubId = result.boostSubId;
                subData = result.subData;
            } else {
                console.log('SUBBING TO AAVE PROXY !!!!');
                console.log('SUBBING TO AAVE PROXY !!!!');
                console.log('SUBBING TO AAVE PROXY !!!!');
                console.log('SUBBING TO AAVE PROXY !!!!');
                console.log('SUBBING TO AAVE PROXY !!!!');
                const result = await subAaveV3AutomationStrategyGeneric(
                    proxy,
                    TRIGGER_REPAY_RATIO,
                    TRIGGER_BOOST_RATIO,
                    TARGET_RATIO_BOOST,
                    TARGET_RATIO_REPAY,
                    BOOST_ENABLED,
                    senderAcc.address,
                    false,
                );
                boostSubId = result.boostSubId;
                subData = result.subData;
            }

            console.log('SUBBED !!!!');
            console.log('SUBBED !!!!');
            console.log('SUBBED !!!!');
            console.log('SUBBED !!!!');
            // Get sub info
            const subDataInStruct = await subProxyContract.parseSubData(subData);
            console.log('subDataInStruct ---------->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
            console.log(subDataInStruct);

            const strategySub = await subProxyContract.formatBoostSub(
                subDataInStruct,
                proxy.address,
                senderAcc.address,
            );

            console.log('strategySub BOOST  ------->>>>>>>>>> \n', strategySub);
            const boostAmount = await fetchAmountInUSDPrice(debtAsset.symbol, BOOST_AMOUNT_IN_USD);
            console.log(boostAmount);

            const exchangeObject = await formatMockExchangeObjUsdFeed(
                debtAsset,
                collAsset,
                boostAmount,
                mockWrapper,
            );

            console.log('exchangeObject !!!!!');
            console.log('exchangeObject !!!!!');
            console.log('exchangeObject !!!!!');
            console.log('exchangeObject !!!!!');
            console.log(exchangeObject);

            // Execute strategy
            if (isFLStrategy) {
                console.log('Executing FL Boost strategy !!!!');
                console.log('Executing FL Boost strategy !!!!');
                console.log('Executing FL Boost strategy !!!!');
                console.log('Executing FL Boost strategy !!!!');
                console.log('Executing FL Boost strategy !!!!');
                console.log('Executing FL Boost strategy !!!!');
                console.log('Executing FL Boost strategy !!!!');
                await addBalancerFlLiquidity(debtAsset.address);
                await addBalancerFlLiquidity(collAsset.address);

                // TODO -> pass random params like placeholderAddr, to check if piping works
                await callAaveV3EOAFLBoostStrategy(
                    strategyExecutor,
                    1,
                    boostSubId,
                    strategySub,
                    exchangeObject,
                    boostAmount,
                    flAddr,
                    debtAsset.address,
                    collAsset.address,
                    placeHolderAddr, // doesnt matter what we put here, will look at it from subData
                );
            } else {
                // TODO -> pass random params like placeholderAddr, to check if piping works
                await callAaveV3EOABoostStrategy(
                    strategyExecutor,
                    0,
                    boostSubId,
                    strategySub,
                    exchangeObject,
                    boostAmount,
                    placeHolderAddr, // doesnt matter what we put here, will look at it from subData
                );
            }

            const ratioAfter = await getAaveV3PositionRatio(positionOwner);
            console.log('ratioAfter', ratioAfter);

            expect(ratioAfter).to.be.lt(ratioBefore);
        };

        const testPairs = AAVE_V3_AUTOMATION_TEST_PAIRS[chainIds[network]] || [];
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
                await baseTest(collAsset, debtAsset, isEOA, isFLStrategy);
            });
            it(`... should execute aaveV3 SW FL boost strategy for ${pair.collSymbol} /
            ${pair.debtSymbol} pair`, async () => {
                const isEOA = false;
                const isFLStrategy = true;
                await baseTest(collAsset, debtAsset, isEOA, isFLStrategy);
            });
            it(`... should execute aaveV3 EOA boost strategy for ${pair.collSymbol} / ${pair.debtSymbol} pair`, async () => {
                const isEOA = true;
                const isFLStrategy = false;
                await baseTest(collAsset, debtAsset, isEOA, isFLStrategy);
            });
            it(`... should execute aaveV3 EOA FL boost strategy for ${pair.collSymbol} / ${pair.debtSymbol} pair`, async () => {
                const isEOA = true;
                const isFLStrategy = true;
                await baseTest(collAsset, debtAsset, isEOA, isFLStrategy);
            });
        }
    });
};

module.exports = {
    runEOABoostTests,
};
