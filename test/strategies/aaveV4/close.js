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
    getCloseStrategyConfigs,
    isCloseToDebtType,
    formatMockExchangeObjUsingExistingPrices,
} = require('../../utils/utils');

const { addBotCaller } = require('../utils/utils-strategies');

const {
    redeployAaveV4Contracts,
    deployAaveV4CloseBundle,
    AAVE_V4_AUTOMATION_TEST_PAIRS,
    openAaveV4ProxyPosition,
    openAaveV4EoaPosition,
    enableAaveV4EoaPositionManagers,
    getSafetyRatio,
    getUserAccountData,
    getAaveV4AssetPrice,
    EOA_ACC_INDEX,
} = require('../../utils/aaveV4');
const { getOwnerAddr, chainIds, balanceOf } = require('../../utils/utils');
const { topUp } = require('../../../scripts/utils/fork');
const { subAaveV4CloseOnPrice } = require('../utils/strategy-subs');
const {
    callAaveV4FLCloseToDebtStrategy,
    callAaveV4FLCloseToCollStrategy,
} = require('../utils/strategy-calls');

const runCloseTests = () => {
    describe('AaveV4 Close Strategies Tests', () => {
        let snapshotId;
        let senderAcc;
        let eoaAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let mockWrapper;
        let flAddr;
        let bundleId;

        before(async function () {
            this.timeout(300000);
            const isFork = isNetworkFork();

            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc = (await hre.ethers.getSigners())[1];
            eoaAcc = (await hre.ethers.getSigners())[EOA_ACC_INDEX];

            if (isFork) {
                await topUp(senderAcc.address);
                await topUp(getOwnerAddr());
                await topUp(botAcc.address);
                await topUp(eoaAcc.address);
            }

            proxy = await getProxy(senderAcc.address);

            await redeploy('RecipeExecutor', isFork);
            strategyExecutor = (await redeploy('StrategyExecutor', isFork)).connect(botAcc);
            flAddr = (await redeploy('FLAction', isFork)).address;
            mockWrapper = await getAndSetMockExchangeWrapper(senderAcc, nullAddress, isFork);

            await redeployAaveV4Contracts();
            await addBotCaller(botAcc.address, isFork);
            bundleId = await deployAaveV4CloseBundle();
        });

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        const baseTest = async (pair, config, isEoa = false) => {
            const collAsset = getAssetInfo(pair.collSymbol, chainIds[network]);
            const debtAsset = getAssetInfo(pair.debtSymbol, chainIds[network]);

            const positionOwner = isEoa ? eoaAcc.address : proxy.address;

            if (isEoa) {
                await openAaveV4EoaPosition(
                    eoaAcc.address,
                    pair.collReserveId,
                    pair.debtReserveId,
                    '1000',
                    '300',
                    pair.spoke,
                );
                await enableAaveV4EoaPositionManagers(eoaAcc, proxy.address, pair.spoke, {
                    approveWithdrawReserveIds: [pair.collReserveId],
                });
            } else {
                await openAaveV4ProxyPosition(
                    proxy,
                    senderAcc.address,
                    pair.collReserveId,
                    pair.debtReserveId,
                    '1000',
                    '300',
                    pair.spoke,
                );
            }

            const ratioBefore = await getSafetyRatio(pair.spoke, positionOwner);
            console.log('ratioBefore', ratioBefore);

            const { subId, strategySub } = await subAaveV4CloseOnPrice(
                bundleId,
                proxy,
                positionOwner,
                pair.spoke,
                collAsset.address,
                pair.collReserveId,
                debtAsset.address,
                pair.debtReserveId,
                config.stopLossPrice,
                config.stopLossType,
                config.takeProfitPrice,
                config.takeProfitType,
            );

            console.log('subId', subId);
            console.log('strategySub', strategySub);

            const closeStrategyType = automationSdk.utils.getCloseStrategyType(
                config.stopLossPrice,
                config.stopLossType,
                config.takeProfitPrice,
                config.takeProfitType,
            );
            const closeToDebt = isCloseToDebtType(automationSdk, closeStrategyType);

            const proxyCollBalanceBefore = await balanceOf(collAsset.address, proxy.address);
            const proxyDebtBalanceBefore = await balanceOf(debtAsset.address, proxy.address);

            await addBalancerFlLiquidity(collAsset.address);
            await addBalancerFlLiquidity(debtAsset.address);

            const userAccountData = await getUserAccountData(pair.spoke, positionOwner);
            const scaling = hre.ethers.utils.parseUnits('1', 26);
            const collAmountInUSD = userAccountData.totalCollateralValue.div(scaling);
            const debtAmountInUSD = userAccountData.totalDebtValueRay.div(scaling);
            console.log('collAmountInUSD', collAmountInUSD);
            console.log('debtAmountInUSD', debtAmountInUSD);

            const collPrice = await getAaveV4AssetPrice(pair.spoke, pair.collReserveId);
            const debtPrice = await getAaveV4AssetPrice(pair.spoke, pair.debtReserveId);

            if (closeToDebt) {
                console.log('Closing to debt');
                const sellAmount = userAccountData.totalCollateralValue
                    .mul(hre.ethers.BigNumber.from(10).pow(collAsset.decimals))
                    .div(collPrice.mul(hre.ethers.BigNumber.from(10).pow(18)));

                const exchangeObject = await formatMockExchangeObjUsingExistingPrices(
                    collAsset,
                    debtAsset,
                    sellAmount,
                    collPrice,
                    debtPrice,
                    mockWrapper,
                );

                const flAmount = userAccountData.totalDebtValueRay
                    .mul(hre.ethers.BigNumber.from(10).pow(debtAsset.decimals))
                    .div(debtPrice.mul(hre.ethers.BigNumber.from(10).pow(45)))
                    .mul(100)
                    .div(99);

                await callAaveV4FLCloseToDebtStrategy(
                    strategyExecutor,
                    0,
                    subId,
                    strategySub,
                    exchangeObject,
                    flAmount,
                    flAddr,
                    debtAsset.address,
                );
            } else {
                console.log('Closing to collateral');
                const flAmount = userAccountData.totalDebtValueRay
                    .mul(hre.ethers.BigNumber.from(10).pow(collAsset.decimals))
                    .div(collPrice.mul(hre.ethers.BigNumber.from(10).pow(45)))
                    .mul(100)
                    .div(99);

                const exchangeObject = await formatMockExchangeObjUsingExistingPrices(
                    collAsset,
                    debtAsset,
                    flAmount,
                    collPrice,
                    debtPrice,
                    mockWrapper,
                );

                await callAaveV4FLCloseToCollStrategy(
                    strategyExecutor,
                    1,
                    subId,
                    strategySub,
                    exchangeObject,
                    flAmount,
                    flAddr,
                    collAsset.address,
                );
            }

            const proxyCollBalanceAfter = await balanceOf(collAsset.address, proxy.address);
            const proxyDebtBalanceAfter = await balanceOf(debtAsset.address, proxy.address);

            expect(proxyCollBalanceAfter).to.be.eq(proxyCollBalanceBefore);
            expect(proxyDebtBalanceAfter).to.be.eq(proxyDebtBalanceBefore);

            const ratioAfter = await getSafetyRatio(pair.spoke, positionOwner);
            console.log('ratioAfter', ratioAfter);
        };

        const closeStrategyConfigs = getCloseStrategyConfigs(automationSdk);

        for (let i = 0; i < AAVE_V4_AUTOMATION_TEST_PAIRS.length; ++i) {
            const pair = AAVE_V4_AUTOMATION_TEST_PAIRS[i];
            for (let j = 0; j < closeStrategyConfigs.length; ++j) {
                const config = closeStrategyConfigs[j];
                const strategyTypeName = automationSdk.utils.getCloseStrategyType(
                    config.stopLossPrice,
                    config.stopLossType,
                    config.takeProfitPrice,
                    config.takeProfitType,
                );
                it(`... should execute aaveV4 SW Close ${strategyTypeName} strategy for ${pair.collSymbol} /
                    ${pair.debtSymbol} pair on ${pair.spokeName} spoke`, async () => {
                    await baseTest(pair, config);
                });
                it(`... should execute aaveV4 EOA Close ${strategyTypeName} strategy for ${pair.collSymbol} /
                    ${pair.debtSymbol} pair on ${pair.spokeName} spoke`, async () => {
                    await baseTest(pair, config, true);
                });
            }
        }
    }).timeout(1000000);
};

module.exports = {
    runCloseTests,
};
