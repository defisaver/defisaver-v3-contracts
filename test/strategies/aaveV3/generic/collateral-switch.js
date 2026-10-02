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
    balanceOf,
} = require('../../../utils/utils');

const { addBotCaller } = require('../../utils/utils-strategies');
const { subAaveV3GenericFLCollateralSwitchStrategy } = require('../../utils/strategy-subs');
const { callAaveV3GenericFLCollateralSwitchStrategy } = require('../../utils/strategy-calls');
const {
    AAVE_V3_GENERIC_COLL_SWITCH_TEST_PAIRS,
    openAaveV3ProxyPosition,
    openAaveV3EOAPosition,
    setupAaveV3EOAPermissions,
    getAaveV3ReserveData,
    deployAaveV3GenericFLCollateralSwitchStrategy,
} = require('../../../utils/aave');

const runAaveV3CollSwitchTests = () => {
    describe('AaveV3 Generic Collateral Switch Strategies Tests', function () {
        this.timeout(600000);
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
            await hre.network.provider.send('hardhat_setNextBlockBaseFeePerGas', ['0x0']);

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

            await redeploy('AaveV3QuotePriceTrigger', isFork);
            await redeploy('AaveV3Borrow', isFork);
            await redeploy('AaveV3Supply', isFork);
            await redeploy('AaveV3Withdraw', isFork);
            await redeploy('PullToken', isFork);
            await redeploy('SubProxy', isFork);
            await redeploy('SendTokenAndUnwrap', isFork);

            strategyId = await deployAaveV3GenericFLCollateralSwitchStrategy();
        });

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        const baseTest = async (pair, isEOA) => {
            const positionOwner = isEOA ? senderAcc.address : proxy.address;

            if (isEOA) {
                await openAaveV3EOAPosition(
                    senderAcc.address,
                    proxy,
                    pair.fromAsset,
                    pair.toAsset,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.marketAddr,
                );
            } else {
                await openAaveV3ProxyPosition(
                    senderAcc.address,
                    proxy,
                    pair.fromAsset,
                    pair.toAsset,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.marketAddr,
                );
            }

            const fromAsset = getAssetInfo(pair.fromAsset, chainIds[network]);
            const toAsset = getAssetInfo(pair.toAsset, chainIds[network]);

            if (isEOA) {
                await setupAaveV3EOAPermissions(
                    senderAcc.address,
                    proxy.address,
                    fromAsset.address,
                    toAsset.address,
                    pair.marketAddr,
                );
            }

            const fromReserveData = await getAaveV3ReserveData(fromAsset.address, pair.marketAddr);
            const fromAssetId = fromReserveData.id;
            const toAssetId = (await getAaveV3ReserveData(toAsset.address, pair.marketAddr)).id;

            const isFullAmountSwitch = pair.amountToSwitchInUSD === hre.ethers.constants.MaxUint256;

            const amountToSwitch = isFullAmountSwitch
                ? hre.ethers.constants.MaxUint256
                : await fetchAmountInUSDPrice(fromAsset.symbol, pair.amountToSwitchInUSD);

            const { subId, strategySub } = await subAaveV3GenericFLCollateralSwitchStrategy(
                proxy,
                strategyId,
                fromAsset.address,
                fromAssetId,
                toAsset.address,
                toAssetId,
                pair.marketAddr,
                amountToSwitch,
                positionOwner,
                fromAsset.address,
                toAsset.address,
                pair.price,
                pair.priceState,
            );

            let exchangeAmount;
            if (isFullAmountSwitch) {
                exchangeAmount = await fetchAmountInUSDPrice(
                    fromAsset.symbol,
                    pair.collAmountInUSD * 0.99,
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

            const dataBefore = await aaveV3View.getTokenBalances(pair.marketAddr, positionOwner, [
                fromAsset.address,
                toAsset.address,
            ]);
            expect(dataBefore[0].enabledAsCollateral).to.be.true;
            expect(dataBefore[1].enabledAsCollateral).to.be.false;

            await callAaveV3GenericFLCollateralSwitchStrategy(
                strategyExecutor,
                0,
                subId,
                strategySub,
                exchangeObject,
                exchangeAmount,
                flAddr,
                fromAsset.address,
                fromReserveData.aTokenAddress,
            );

            const dataAfter = await aaveV3View.getTokenBalances(pair.marketAddr, positionOwner, [
                fromAsset.address,
                toAsset.address,
            ]);

            const proxyFromAssetBalanceAfter = await balanceOf(fromAsset.address, proxy.address);
            const proxyToAssetBalanceAfter = await balanceOf(toAsset.address, proxy.address);
            expect(proxyFromAssetBalanceAfter).to.be.eq(0);
            expect(proxyToAssetBalanceAfter).to.be.eq(0);

            expect(dataAfter[1].balance).to.be.gt(dataBefore[1].balance);
            expect(dataAfter[0].borrowsVariable).to.be.eq(0);
            expect(dataAfter[1].borrowsVariable).to.be.gte(dataBefore[1].borrowsVariable);
            expect(dataAfter[1].borrowsVariable).to.be.lte(
                dataBefore[1].borrowsVariable.mul(1001).div(1000),
            );

            if (isFullAmountSwitch) {
                expect(dataAfter[0].enabledAsCollateral).to.be.false;
                expect(dataAfter[1].enabledAsCollateral).to.be.true;
                expect(dataAfter[0].balance).to.be.eq(0);
            } else {
                expect(dataAfter[0].enabledAsCollateral).to.be.true;
                expect(dataAfter[1].enabledAsCollateral).to.be.true;
                const switchedAmount = dataBefore[0].balance.sub(dataAfter[0].balance);
                expect(switchedAmount).to.be.gte(amountToSwitch.mul(999).div(1000));
                expect(switchedAmount).to.be.lte(amountToSwitch.mul(1001).div(1000));
            }
        };

        const mapAsset = (asset) => (network === 'base' && asset === 'WBTC' ? 'cbBTC' : asset);
        const testPairs = AAVE_V3_GENERIC_COLL_SWITCH_TEST_PAIRS.map((pair) => ({
            ...pair,
            fromAsset: mapAsset(pair.fromAsset),
            toAsset: mapAsset(pair.toAsset),
        }));
        for (let i = 0; i < testPairs.length; ++i) {
            const pair = testPairs[i];
            const isFull = pair.amountToSwitchInUSD === hre.ethers.constants.MaxUint256;
            const switchType = isFull ? 'full' : 'partial';
            it(`... should execute AaveV3 generic SW fl ${switchType} collateral switch from ${pair.fromAsset} to ${pair.toAsset}`, async () => {
                await baseTest(pair, false);
            });
            it(`... should execute AaveV3 generic EOA fl ${switchType} collateral switch from ${pair.fromAsset} to ${pair.toAsset}`, async () => {
                await baseTest(pair, true);
            });
        }
    });
};

module.exports = {
    runAaveV3CollSwitchTests,
};
