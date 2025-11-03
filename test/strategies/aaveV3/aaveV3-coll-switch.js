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
    AAVE_V3_COLL_SWITCH_TEST_PAIRS,
    openAaveV3ProxyPosition,
    getAaveV3ReserveData,
} = require('../../utils/aave');
const { deployAaveV3FLCollateralSwitchStrategy } = require('../../utils/aave');
const { subAaveV3FLCollateralSwitchStrategy } = require('../utils/strategy-subs');
const { callAaveV3FLCollateralSwitchStrategy } = require('../utils/strategy-calls');

const runAaveV3CollSwitchTests = () => {
    describe('AaveV3 Coll Switch Strategies Tests', () => {
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
            strategyId = await deployAaveV3FLCollateralSwitchStrategy();
        });
        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });
        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        for (let i = 0; i < AAVE_V3_COLL_SWITCH_TEST_PAIRS.length; ++i) {
            const pair = AAVE_V3_COLL_SWITCH_TEST_PAIRS[i];
            it(`... should execute aaveV3 fl collateral switch from ${pair.fromAsset} to ${pair.toAsset}`, async () => {
                /*//////////////////////////////////////////////////////////////
                                        OPEN POSITION
                //////////////////////////////////////////////////////////////*/
                await openAaveV3ProxyPosition(
                    senderAcc.address,
                    proxy,
                    pair.fromAsset,
                    pair.toAsset,
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
                const { subId, strategySub } = await subAaveV3FLCollateralSwitchStrategy(
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

                let exchangeAmount;
                if (isFullAmountSwitch) {
                    exchangeAmount = await fetchAmountInUSDPrice(
                        fromAsset.symbol,
                        pair.collAmountInUSD * 0.99, // To handle any fees and rounding errors and test dust behavior
                    );
                } else {
                    exchangeAmount = await fetchAmountInUSDPrice(
                        fromAsset.symbol,
                        pair.amountToSwitchInUSD,
                    );
                }

                const exchangeObject = await formatMockExchangeObjUsdFeed(
                    fromAsset,
                    toAsset,
                    exchangeAmount,
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
                    `${fromAsset.symbol} balance before: ${dataBefore[0].balance.toString()}`,
                );
                console.log(
                    `${toAsset.symbol} balance before: ${dataBefore[1].balance.toString()}`,
                );
                expect(dataBefore[0].enabledAsCollateral).to.be.true;
                expect(dataBefore[1].enabledAsCollateral).to.be.false;

                /*//////////////////////////////////////////////////////////////
                                        CALL STRATEGY
                //////////////////////////////////////////////////////////////*/
                await callAaveV3FLCollateralSwitchStrategy(
                    strategyExecutor,
                    0,
                    subId,
                    strategySub,
                    exchangeAmount,
                    exchangeObject,
                    fromAsset.address,
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
                    `${fromAsset.symbol} balance after: ${dataAfter[0].balance.toString()}`,
                );
                console.log(`${toAsset.symbol} balance after: ${dataAfter[1].balance.toString()}`);

                /*//////////////////////////////////////////////////////////////
                                          ASSERTS
                //////////////////////////////////////////////////////////////*/
                const proxyFromAssetBalanceAfter = await balanceOf(
                    fromAsset.address,
                    proxy.address,
                );
                const proxyToAssetBalanceAfter = await balanceOf(toAsset.address, proxy.address);
                expect(proxyFromAssetBalanceAfter).to.be.eq(0);
                expect(proxyToAssetBalanceAfter).to.be.eq(0);

                if (isFullAmountSwitch) {
                    expect(dataAfter[0].enabledAsCollateral).to.be.false;
                    expect(dataAfter[1].enabledAsCollateral).to.be.true;
                    expect(dataAfter[0].balance).to.be.eq(0);
                } else {
                    expect(dataAfter[0].enabledAsCollateral).to.be.true;
                    expect(dataAfter[1].enabledAsCollateral).to.be.true;
                }
            });
        }
    });
};

describe('AaveV3 coll switch strategy test', function () {
    this.timeout(80000);
    it('... test AaveV3 coll switch strategy', async () => {
        await runAaveV3CollSwitchTests();
    });
});

module.exports = {
    runAaveV3CollSwitchTests,
};
