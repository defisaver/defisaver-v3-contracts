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
const { subAaveV3GenericFLDebtSwitchStrategy } = require('../../utils/strategy-subs');
const { callAaveV3GenericFLDebtSwitchStrategy } = require('../../utils/strategy-calls');
const {
    AAVE_V3_DEBT_SWITCH_TEST_PAIRS,
    openAaveV3ProxyPosition,
    openAaveV3EOAPosition,
    setupAaveV3EOAPermissions,
    getAaveV3ReserveData,
    deployAaveV3GenericFLDebtSwitchStrategy,
} = require('../../../utils/aave');

const runAaveV3DebtSwitchTests = () => {
    describe('AaveV3 Generic Debt Switch Strategies Tests', function () {
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
            botAcc = (await hre.ethers.getSigners())[1];
            await sendEther(senderAcc, addrs[network].OWNER_ACC, '10');
            proxy = await getProxy(senderAcc.address);
            await addBotCaller(botAcc.address, isFork);
            strategyExecutor = (await getStrategyExecutorContract()).connect(botAcc);
            mockWrapper = await getAndSetMockExchangeWrapper(senderAcc);

            const flContract = await getContractFromRegistry('FLAction', isFork);
            flAddr = flContract.address;

            // Redeploys
            await redeploy('AaveV3QuotePriceTrigger', isFork);
            await redeploy('AaveV3Borrow', isFork);
            await redeploy('AaveV3Payback', isFork);
            aaveV3View = await redeploy('AaveV3View', isFork);
            await redeploy('SubProxy', isFork);
            await redeploy('SendTokenAndUnwrap', isFork);

            strategyId = await deployAaveV3GenericFLDebtSwitchStrategy();
        });

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        const baseTest = async (pair, isEOA) => {
            const collAsset = getAssetInfo(pair.collAsset, chainIds[network]);
            const fromAsset = getAssetInfo(pair.fromAsset, chainIds[network]);
            const toAsset = getAssetInfo(pair.toAsset, chainIds[network]);
            const positionOwner = isEOA ? senderAcc.address : proxy.address;

            /*//////////////////////////////////////////////////////////////
                                    OPEN POSITION
                Collateral in `collAsset`, debt in `fromAsset` (the debt we switch FROM).
            //////////////////////////////////////////////////////////////*/
            if (isEOA) {
                await openAaveV3EOAPosition(
                    senderAcc.address,
                    proxy,
                    collAsset.symbol,
                    fromAsset.symbol,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.marketAddr,
                );

                // Strategy borrows the new debt (toAsset) on behalf of the EOA,
                // so the EOA has to delegate credit for it to the Smart Wallet that executes it.
                await setupAaveV3EOAPermissions(
                    senderAcc.address,
                    proxy.address,
                    collAsset.address,
                    toAsset.address,
                    pair.marketAddr,
                );
            } else {
                await openAaveV3ProxyPosition(
                    senderAcc.address,
                    proxy,
                    collAsset.symbol,
                    fromAsset.symbol,
                    pair.collAmountInUSD,
                    pair.debtAmountInUSD,
                    pair.marketAddr,
                );
            }

            const fromAssetId = (await getAaveV3ReserveData(fromAsset.address, pair.marketAddr)).id;
            const toAssetId = (await getAaveV3ReserveData(toAsset.address, pair.marketAddr)).id;

            const isFullAmountSwitch = pair.amountToSwitchInUSD === hre.ethers.constants.MaxUint256;

            const amountToSwitch = isFullAmountSwitch
                ? hre.ethers.constants.MaxUint256
                : await fetchAmountInUSDPrice(fromAsset.symbol, pair.amountToSwitchInUSD);

            /*//////////////////////////////////////////////////////////////
                                    SUB TO STRATEGY
            //////////////////////////////////////////////////////////////*/
            const { subId, strategySub } = await subAaveV3GenericFLDebtSwitchStrategy(
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

            /*//////////////////////////////////////////////////////////////
                                BUILD EXCHANGE OBJECT
                We flashloan `toAsset` (new debt) and sell it into `fromAsset` (old debt).
                Flashloan amount is sized 1% above the amount being switched, to cover the
                gas / dfs fee taken from the sell output. Surplus `fromAsset` is sent to the EOA.
            //////////////////////////////////////////////////////////////*/
            const switchAmountInUSD =
                (isFullAmountSwitch ? pair.debtAmountInUSD : pair.amountToSwitchInUSD) * 1.01;

            const flAmount = await fetchAmountInUSDPrice(toAsset.symbol, switchAmountInUSD);

            const exchangeObject = await formatMockExchangeObjUsdFeed(
                toAsset,
                fromAsset,
                flAmount,
                mockWrapper,
            );

            await addBalancerFlLiquidity(toAsset.address);

            /*//////////////////////////////////////////////////////////////
                                 TAKE SNAPSHOT BEFORE
            //////////////////////////////////////////////////////////////*/
            const dataBefore = await aaveV3View.getTokenBalances(pair.marketAddr, positionOwner, [
                fromAsset.address,
                toAsset.address,
                collAsset.address,
            ]);
            console.log(
                `${fromAsset.symbol} debt before: ${dataBefore[0].borrowsVariable.toString()}`,
            );
            console.log(
                `${toAsset.symbol} debt before: ${dataBefore[1].borrowsVariable.toString()}`,
            );
            expect(dataBefore[0].borrowsVariable).to.be.gt(0);
            expect(dataBefore[1].borrowsVariable).to.be.eq(0);
            expect(dataBefore[2].enabledAsCollateral).to.be.true;

            // Leftover `fromAsset` is unwrapped if it's WETH, so track ETH in that case.
            const dustAssetAddr =
                fromAsset.symbol === 'WETH' ? addrs[network].ETH_ADDR : fromAsset.address;
            const eoaDustBalanceBefore = await balanceOf(dustAssetAddr, senderAcc.address);

            /*//////////////////////////////////////////////////////////////
                                    CALL STRATEGY
            //////////////////////////////////////////////////////////////*/
            await callAaveV3GenericFLDebtSwitchStrategy(
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
            const dataAfter = await aaveV3View.getTokenBalances(pair.marketAddr, positionOwner, [
                fromAsset.address,
                toAsset.address,
                collAsset.address,
            ]);
            console.log(
                `${fromAsset.symbol} debt after: ${dataAfter[0].borrowsVariable.toString()}`,
            );
            console.log(`${toAsset.symbol} debt after: ${dataAfter[1].borrowsVariable.toString()}`);

            /*//////////////////////////////////////////////////////////////
                                        ASSERTS
            //////////////////////////////////////////////////////////////*/
            // No tokens should be stuck on the proxy.
            expect(await balanceOf(fromAsset.address, proxy.address)).to.be.eq(0);
            expect(await balanceOf(toAsset.address, proxy.address)).to.be.eq(0);

            // Leftover fromAsset should be returned to the EOA.
            const eoaDustBalanceAfter = await balanceOf(dustAssetAddr, senderAcc.address);
            expect(eoaDustBalanceAfter).to.be.gt(eoaDustBalanceBefore);

            // New debt in toAsset equals the flashloaned amount (borrowed to repay the flashloan).
            // Aave rounds new debt up in its favour, so it can be at most 2 wei above the borrowed amount.
            expect(dataAfter[1].borrowsVariable).to.be.gte(flAmount);
            expect(dataAfter[1].borrowsVariable).to.be.lte(flAmount.add(2));

            if (isFullAmountSwitch) {
                // Whole fromAsset debt switched away.
                expect(dataAfter[0].borrowsVariable).to.be.eq(0);
            } else {
                // Partial switch: old debt reduced by amountToSwitch (up to interest accrued in between).
                const repaid = dataBefore[0].borrowsVariable.sub(dataAfter[0].borrowsVariable);
                expect(repaid).to.be.gte(amountToSwitch.mul(999).div(1000));
                expect(repaid).to.be.lte(amountToSwitch.mul(1001).div(1000));
                expect(dataAfter[0].borrowsVariable).to.be.gt(0);
            }

            // Collateral must be untouched.
            expect(dataAfter[2].enabledAsCollateral).to.be.true;
            expect(dataAfter[2].balance).to.be.gte(dataBefore[2].balance);
        };

        const testPairs = AAVE_V3_DEBT_SWITCH_TEST_PAIRS[chainIds[network]] || [];
        for (let i = 0; i < testPairs.length; ++i) {
            const pair = testPairs[i];
            const isFull = pair.amountToSwitchInUSD === hre.ethers.constants.MaxUint256;
            const switchType = isFull ? 'full' : 'partial';
            it(`... should execute aaveV3 generic SW fl ${switchType} debt switch from ${pair.fromAsset} to ${pair.toAsset}`, async () => {
                await baseTest(pair, false);
            });
            it(`... should execute aaveV3 generic EOA fl ${switchType} debt switch from ${pair.fromAsset} to ${pair.toAsset}`, async () => {
                await baseTest(pair, true);
            });
        }
    });
};

module.exports = {
    runAaveV3DebtSwitchTests,
};
