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
    sendEther,
    addBalancerFlLiquidity,
    balanceOf,
} = require('../../utils/utils');

const { addBotCaller } = require('../utils/utils-strategies');
const {
    AAVE_V3_DEBT_SWITCH_TEST_PAIRS,
    openAaveV3ProxyPosition,
    getAaveV3ReserveData,
    deployAaveV3FLDebtSwitchStrategy,
} = require('../../utils/aave');
const { subAaveV3FLDebtSwitchStrategy } = require('../utils/strategy-subs');
const { callAaveV3FLDebtSwitchStrategy } = require('../utils/strategy-calls');

const runAaveV3DebtSwitchTests = () => {
    describe('AaveV3 Debt Switch Strategies Tests', () => {
        let snapshotId;
        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let mockWrapper;
        let flAddr;
        let aaveV3View;
        let strategyId;

        before(async () => {
            const isFork = isNetworkFork();
            senderAcc = (await hre.ethers.getSigners())[0];
            await sendEther(senderAcc, addrs[network].OWNER_ACC, '10');
            botAcc = (await hre.ethers.getSigners())[1];
            proxy = await getProxy(senderAcc.address);
            await addBotCaller(botAcc.address, isFork);
            strategyExecutor = (await getStrategyExecutorContract()).connect(botAcc);
            mockWrapper = await getAndSetMockExchangeWrapper(senderAcc);
            aaveV3View = await redeploy('AaveV3View', isFork);
            const flContract = await getContractFromRegistry('FLAction', isFork);
            flAddr = flContract.address;
            strategyId = await deployAaveV3FLDebtSwitchStrategy();
        });
        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });
        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        for (let i = 0; i < AAVE_V3_DEBT_SWITCH_TEST_PAIRS.length; ++i) {
            const pair = AAVE_V3_DEBT_SWITCH_TEST_PAIRS[i];
            it(`... should execute aaveV3 fl debt switch from ${pair.fromAsset} to ${pair.toAsset}`, async () => {
                /*//////////////////////////////////////////////////////////////
                                        OPEN POSITION
                    Collateral in `collAsset`, debt in `fromAsset` (the debt we switch FROM).
                //////////////////////////////////////////////////////////////*/
                await openAaveV3ProxyPosition(
                    senderAcc.address,
                    proxy,
                    pair.collAsset,
                    pair.fromAsset,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.marketAddr,
                );

                const fromAsset = getAssetInfo(pair.fromAsset, chainIds[network]);
                const toAsset = getAssetInfo(pair.toAsset, chainIds[network]);

                const fromAssetId = (await getAaveV3ReserveData(fromAsset.address, pair.marketAddr))
                    .id;
                const toAssetId = (await getAaveV3ReserveData(toAsset.address, pair.marketAddr)).id;

                const isFullAmountSwitch =
                    pair.amountToSwitchInUSD === hre.ethers.constants.MaxUint256;

                const amountToSwitch = isFullAmountSwitch
                    ? hre.ethers.constants.MaxUint256
                    : await fetchAmountInUSDPrice(fromAsset.symbol, pair.amountToSwitchInUSD);

                /*//////////////////////////////////////////////////////////////
                                        SUB TO STRATEGY
                //////////////////////////////////////////////////////////////*/
                const { subId, strategySub } = await subAaveV3FLDebtSwitchStrategy(
                    proxy,
                    strategyId,
                    fromAsset.address,
                    fromAssetId,
                    toAsset.address,
                    toAssetId,
                    pair.marketAddr,
                    amountToSwitch,
                    fromAsset.address,
                    toAsset.address,
                    pair.price,
                    pair.priceState,
                );

                /*//////////////////////////////////////////////////////////////
                                    BUILD EXCHANGE OBJECT
                    We sell the flashloaned toAsset (new debt) into fromAsset (old debt).
                    The flashloan amount is sized to roughly cover the debt being switched
                    plus a small buffer for gas/slippage; surplus fromAsset is returned to EOA.
                //////////////////////////////////////////////////////////////*/
                let switchAmountInUSD;
                if (isFullAmountSwitch) {
                    // Slightly overshoot the whole debt to leave dust and exercise dust return.
                    switchAmountInUSD = pair.debtAmountInUSD * 1.01;
                } else {
                    switchAmountInUSD = pair.amountToSwitchInUSD * 1.01;
                }

                // flAmount is denominated in toAsset (what we flashloan & sell).
                const flAmount = await fetchAmountInUSDPrice(toAsset.symbol, switchAmountInUSD);

                const exchangeObject = await formatMockExchangeObjUsdFeed(
                    toAsset,
                    fromAsset,
                    flAmount,
                    mockWrapper,
                );

                await addBalancerFlLiquidity(fromAsset.address);
                await addBalancerFlLiquidity(toAsset.address);

                /*//////////////////////////////////////////////////////////////
                                     TAKE SNAPSHOT BEFORE
                //////////////////////////////////////////////////////////////*/
                const dataBefore = await aaveV3View.getTokenBalances(
                    pair.marketAddr,
                    proxy.address,
                    [fromAsset.address, toAsset.address],
                );
                console.log('----------- BEFORE CALL ------------');
                console.log(dataBefore);
                console.log(
                    `${fromAsset.symbol} debt before: ${dataBefore[0].borrowsVariable.toString()}`,
                );
                console.log(
                    `${toAsset.symbol} debt before: ${dataBefore[1].borrowsVariable.toString()}`,
                );
                expect(dataBefore[0].borrowsVariable).to.be.gt(0);
                expect(dataBefore[1].borrowsVariable).to.be.eq(0);

                /*//////////////////////////////////////////////////////////////
                                        CALL STRATEGY
                //////////////////////////////////////////////////////////////*/
                await callAaveV3FLDebtSwitchStrategy(
                    strategyExecutor,
                    0,
                    subId,
                    strategySub,
                    flAmount,
                    exchangeObject,
                    fromAsset.address,
                    toAsset.address,
                    flAddr,
                );

                /*//////////////////////////////////////////////////////////////
                                      TAKE SNAPSHOT AFTER
                //////////////////////////////////////////////////////////////*/
                const dataAfter = await aaveV3View.getTokenBalances(
                    pair.marketAddr,
                    proxy.address,
                    [fromAsset.address, toAsset.address],
                );
                console.log('------------ AFTER CALL ------------');
                console.log(dataAfter);
                console.log(
                    `${fromAsset.symbol} debt after: ${dataAfter[0].borrowsVariable.toString()}`,
                );
                console.log(
                    `${toAsset.symbol} debt after: ${dataAfter[1].borrowsVariable.toString()}`,
                );

                /*//////////////////////////////////////////////////////////////
                                          ASSERTS
                //////////////////////////////////////////////////////////////*/
                // No tokens should be stuck on the proxy (dust is sent to the EOA).
                const proxyFromAssetBalanceAfter = await balanceOf(
                    fromAsset.address,
                    proxy.address,
                );
                const proxyToAssetBalanceAfter = await balanceOf(toAsset.address, proxy.address);
                expect(proxyFromAssetBalanceAfter).to.be.eq(0);
                expect(proxyToAssetBalanceAfter).to.be.eq(0);

                // New debt in toAsset must have been opened.
                expect(dataAfter[1].borrowsVariable).to.be.gt(0);

                if (isFullAmountSwitch) {
                    // Whole fromAsset debt switched away.
                    expect(dataAfter[0].borrowsVariable).to.be.eq(0);
                } else {
                    // Partial switch: old debt reduced but not eliminated.
                    expect(dataAfter[0].borrowsVariable).to.be.lt(dataBefore[0].borrowsVariable);
                    expect(dataAfter[0].borrowsVariable).to.be.gt(0);
                }
            });
        }
    });
};

describe('AaveV3 debt switch strategy test', function () {
    this.timeout(80000);
    it('... test AaveV3 debt switch strategy', async () => {
        await runAaveV3DebtSwitchTests();
    });
});

module.exports = {
    runAaveV3DebtSwitchTests,
};
