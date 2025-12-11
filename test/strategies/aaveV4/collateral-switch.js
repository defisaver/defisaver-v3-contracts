const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfo } = require('@defisaver/tokens');
const automationSdk = require('@defisaver/automation-sdk');

const {
    getProxy,
    network,
    takeSnapshot,
    revertToSnapshot,
    getAndSetMockExchangeWrapper,
    isNetworkFork,
    addBalancerFlLiquidity,
    nullAddress,
    redeploy,
    balanceOf,
    chainIds,
    getOwnerAddr,
    formatMockExchangeObjUsingExistingPrices,
} = require('../../utils/utils');

const { addBotCaller } = require('../utils/utils-strategies');

const {
    redeployAaveV4Contracts,
    AAVE_V4_AUTOMATION_TEST_PAIRS,
    openAaveV4ProxyPosition,
    getSafetyRatio,
    deployAaveV4FLCollateralSwitchStrategy,
    getUserAccountData,
    getAaveV4AssetPrice,
    getUserSuppliedAmount,
    CORE_RESERVE_ID_USDT,
} = require('../../utils/aaveV4');

const { topUp } = require('../../../scripts/utils/fork');
const { subAaveV4FLCollateralSwitchStrategy } = require('../utils/strategy-subs');
const { callAaveV4FLCollateralSwitchStrategy } = require('../utils/strategy-calls');

const runCollateralSwitchTests = () => {
    describe('AaveV4 Collateral Switch Strategies Tests', () => {
        let snapshotId;
        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let mockWrapper;
        let flAddr;
        let strategyId;

        before(async () => {
            const isFork = isNetworkFork();

            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc = (await hre.ethers.getSigners())[1];

            if (isFork) {
                await topUp(senderAcc.address);
                await topUp(getOwnerAddr());
                await topUp(botAcc.address);
            }

            proxy = await getProxy(senderAcc.address);

            await redeploy('RecipeExecutor', isFork);
            strategyExecutor = (await redeploy('StrategyExecutor', isFork)).connect(botAcc);
            flAddr = (await redeploy('FLAction', isFork)).address;
            mockWrapper = await getAndSetMockExchangeWrapper(senderAcc, nullAddress, isFork);

            await redeployAaveV4Contracts();
            await addBotCaller(botAcc.address, isFork);
            strategyId = await deployAaveV4FLCollateralSwitchStrategy();
        });

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        const baseTest = async (pair, isMaxUint256Switch, swithReserveId, swithAssetSymbol) => {
            const collAmountInUSD = '1000';
            const debtAmountInUSD = '300';
            const triggerPrice = '0'; // Should trigger if price > 0
            const collAsset = getAssetInfo(pair.collSymbol, chainIds[network]);
            const switchAsset = getAssetInfo(swithAssetSymbol, chainIds[network]);

            /*//////////////////////////////////////////////////////////////
                                    OPEN POSITION
            //////////////////////////////////////////////////////////////*/
            await openAaveV4ProxyPosition(
                proxy,
                senderAcc.address,
                pair.collReserveId,
                pair.debtReserveId,
                collAmountInUSD,
                debtAmountInUSD,
                pair.spoke,
            );

            /*//////////////////////////////////////////////////////////////
                                  GET POSITION DATA
            //////////////////////////////////////////////////////////////*/
            const ratioBefore = await getSafetyRatio(pair.spoke, proxy.address);
            console.log('ratioBefore', ratioBefore);
            const userAccountData = await getUserAccountData(pair.spoke, proxy.address);
            const collPrice = await getAaveV4AssetPrice(pair.spoke, pair.collReserveId);
            const switchAssetPrice = await getAaveV4AssetPrice(pair.spoke, swithReserveId);
            const fullCollateralAmount = userAccountData.totalCollateralValue
                .mul(hre.ethers.BigNumber.from(10).pow(collAsset.decimals))
                .div(collPrice.mul(hre.ethers.BigNumber.from(10).pow(18)));
            const partialCollateralAmount = fullCollateralAmount.div(10);

            /*//////////////////////////////////////////////////////////////
                                  SUB TO STRATEGY
            //////////////////////////////////////////////////////////////*/
            console.log('Sub to strategy...');
            const { subId, strategySub } = await subAaveV4FLCollateralSwitchStrategy(
                strategyId,
                proxy,
                proxy.address,
                pair.spoke,
                collAsset.address,
                pair.collReserveId,
                switchAsset.address,
                swithReserveId,
                isMaxUint256Switch ? hre.ethers.constants.MaxUint256 : partialCollateralAmount,
                triggerPrice,
                automationSdk.enums.RatioState.OVER,
            );

            /*//////////////////////////////////////////////////////////////
                                  CALCULATE EXCHANGE AMOUNT
            //////////////////////////////////////////////////////////////*/
            const exchangeAmount = isMaxUint256Switch
                ? fullCollateralAmount.mul(99).div(100) // To handle any fees and rounding errors
                : partialCollateralAmount;
            const exchangeObject = await formatMockExchangeObjUsingExistingPrices(
                collAsset,
                switchAsset,
                exchangeAmount,
                collPrice,
                switchAssetPrice,
                mockWrapper,
            );

            /*//////////////////////////////////////////////////////////////
                                  ADD BALANCER LIQUIDITY
            //////////////////////////////////////////////////////////////*/
            console.log('Adding balancer liquidity...');
            await addBalancerFlLiquidity(collAsset.address);
            await addBalancerFlLiquidity(switchAsset.address);

            /*//////////////////////////////////////////////////////////////
                                  TAKE SNAPSHOT BEFORE
            //////////////////////////////////////////////////////////////*/
            console.log('Taking snapshot before...');
            const proxyFromAssetBalanceBefore = await balanceOf(collAsset.address, proxy.address);
            const proxyToAssetBalanceBefore = await balanceOf(switchAsset.address, proxy.address);
            const positionFromCollateralBalanceBefore = await getUserSuppliedAmount(
                pair.spoke,
                proxy.address,
                pair.collReserveId,
            );
            const positionToCollateralBalanceBefore = await getUserSuppliedAmount(
                pair.spoke,
                proxy.address,
                swithReserveId,
            );

            /*//////////////////////////////////////////////////////////////
                                  CALL STRATEGY
            //////////////////////////////////////////////////////////////*/
            console.log('Calling AaveV4 FL Collateral Switch strategy...');
            await callAaveV4FLCollateralSwitchStrategy(
                strategyExecutor,
                0,
                subId,
                strategySub,
                exchangeObject,
                exchangeAmount,
                flAddr,
                collAsset.address,
            );

            /*//////////////////////////////////////////////////////////////
                                  TAKE SNAPSHOT AFTER
            //////////////////////////////////////////////////////////////*/
            console.log('Taking snapshot after...');
            const proxyFromAssetBalanceAfter = await balanceOf(collAsset.address, proxy.address);
            const proxyToAssetBalanceAfter = await balanceOf(switchAsset.address, proxy.address);
            const positionFromCollateralBalanceAfter = await getUserSuppliedAmount(
                pair.spoke,
                proxy.address,
                pair.collReserveId,
            );
            const positionToCollateralBalanceAfter = await getUserSuppliedAmount(
                pair.spoke,
                proxy.address,
                swithReserveId,
            );

            /*//////////////////////////////////////////////////////////////
                                      ASSERTS
            //////////////////////////////////////////////////////////////*/
            console.log('Asserts...');
            expect(proxyFromAssetBalanceAfter).to.be.eq(proxyFromAssetBalanceBefore);
            expect(proxyToAssetBalanceAfter).to.be.eq(proxyToAssetBalanceBefore);

            if (isMaxUint256Switch) {
                expect(positionFromCollateralBalanceAfter).to.be.eq(0);
                expect(positionToCollateralBalanceAfter).to.be.gt(0);
            } else {
                expect(positionFromCollateralBalanceAfter).to.be.lt(
                    positionFromCollateralBalanceBefore,
                );
                expect(positionToCollateralBalanceAfter).to.be.gt(
                    positionToCollateralBalanceBefore,
                );
            }
        };

        for (let i = 0; i < AAVE_V4_AUTOMATION_TEST_PAIRS.length; ++i) {
            const pair = AAVE_V4_AUTOMATION_TEST_PAIRS[i];
            it('... should execute aaveV4 SW full amount FL collateral switch strategy', async () => {
                const isMaxUint256Switch = true;
                // TODO: Hardcode for now like this to avoid caps
                await baseTest(pair, isMaxUint256Switch, CORE_RESERVE_ID_USDT, 'USDT');
            });
            it(`... should execute aaveV4 SW partial amount FL collateral switch strategy for ${pair.collSymbol} /
                ${pair.debtSymbol} pair on ${pair.spokeName} spoke`, async () => {
                const isMaxUint256Switch = false;
                // TODO: Hardcode for now like this to avoid caps
                await baseTest(pair, isMaxUint256Switch, CORE_RESERVE_ID_USDT, 'USDT');
            });
        }
    }).timeout(1400000);
};

module.exports = {
    runCollateralSwitchTests,
};
