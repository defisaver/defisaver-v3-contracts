/* eslint-disable max-len */
const hre = require('hardhat');
const { expect } = require('chai');
const { getAssetInfo } = require('@defisaver/tokens');
const automationSdk = require('@defisaver/automation-sdk');

const {
    getProxy,
    setBalance,
    network,
    addrs,
    chainIds,
    takeSnapshot,
    revertToSnapshot,
    isNetworkFork,
    getOwnerAddr,
    fetchTokenPriceInUSD,
    fetchAmountInUSDPrice,
    getContractFromRegistry,
    formatExchangeObj,
    openStrategyAndBundleStorage,
    balanceOf,
} = require('../../utils/utils');

const {
    addBotCaller,
    createStrategy,
    createBundle,
} = require('../utils/utils-strategies');

const {
    aaveV3Supply,
} = require('../../utils/actions');

const { topUp } = require('../../../scripts/utils/fork');
const { subAaveV3OpenOrder } = require('../utils/strategy-subs');
const { callAaveV3OpenOrderFromCollStrategy, callAaveV3FLOpenOrderFromCollStrategy, callAaveV3FLOpenOrderFromDebtStrategy } = require('../utils/strategy-calls');
const { createAaveV3OpenOrderFromCollStrategy, createAaveV3FLOpenOrderFromCollStrategy, createAaveV3FLOpenOrderFromDebtStrategy } = require('../../../strategies-spec/mainnet');
const { createAaveV3OpenOrderFromCollL2Strategy, createAaveV3FLOpenOrderFromCollL2Strategy, createAaveV3FLOpenOrderFromDebtL2Strategy } = require('../../../strategies-spec/l2');

const deployOpenOrderFromCollBundle = async (proxy, isFork) => {
    await openStrategyAndBundleStorage(isFork);

    const openStrategy = network === 'mainnet' ? createAaveV3OpenOrderFromCollStrategy() : createAaveV3OpenOrderFromCollL2Strategy();
    const flOpenStrategy = network === 'mainnet' ? createAaveV3FLOpenOrderFromCollStrategy() : createAaveV3FLOpenOrderFromCollL2Strategy();
    const aaveV3OpenOrderFromCollStrategyId = await createStrategy(...openStrategy, false);
    const aaveV3FLOpenOrderFromCollStrategyId = await createStrategy(...flOpenStrategy, false);
    const aaveV3OpenOrderFromCollBundleId = await createBundle(
        [aaveV3OpenOrderFromCollStrategyId, aaveV3FLOpenOrderFromCollStrategyId],
    );
    return aaveV3OpenOrderFromCollBundleId;
};

const deployOpenOrderFromDebtStrategy = async (proxy, isFork) => {
    await openStrategyAndBundleStorage(isFork);

    const openStrategy = network === 'mainnet' ? createAaveV3FLOpenOrderFromDebtStrategy() : createAaveV3FLOpenOrderFromDebtL2Strategy();
    const aaveV3FLOpenOrderFromDebtStrategyId = await createStrategy(...openStrategy, false);
    return aaveV3FLOpenOrderFromDebtStrategyId;
};

const aaveV3OpenOrderStrategyTest = async (isFork, useDeployedStrategies) => {
    describe('AaveV3-Open-Order-Strategy-Test', function () {
        this.timeout(1200000);

        let snapshotId;
        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let flAction;

        let openOrderFromCollBundleId;
        let openOrderFromDebtStrategyId;

        const setUpCallers = async () => {
            [senderAcc, botAcc] = await hre.ethers.getSigners();
            if (isFork) {
                await topUp(senderAcc.address);
                await topUp(botAcc.address);
                await topUp(getOwnerAddr());
            }
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
        };

        const setUpContracts = async () => {
            if (network === 'mainnet') {
                strategyExecutor = await hre.ethers.getContractAt('StrategyExecutor', addrs[network].STRATEGY_EXECUTOR_ADDR);
            } else {
                strategyExecutor = await hre.ethers.getContractAt('StrategyExecutorL2', addrs[network].STRATEGY_EXECUTOR_ADDR);
            }
            strategyExecutor = strategyExecutor.connect(botAcc);
            flAction = await getContractFromRegistry('FLAction', isFork);
        };

        const deployStrategies = async () => {
            if (!useDeployedStrategies) {
                openOrderFromCollBundleId = await deployOpenOrderFromCollBundle(proxy, isFork);
                openOrderFromDebtStrategyId = await deployOpenOrderFromDebtStrategy(proxy, isFork);
            } else if (network === 'mainnet') {
                openOrderFromCollBundleId = automationSdk.enums.Bundles.MainnetIds.AAVE_V3_OPEN_ORDER_FROM_COLLATERAL;
                openOrderFromDebtStrategyId = automationSdk.enums.Strategies.MainnetIds.AAVE_V3_OPEN_ORDER_FROM_DEBT;
            } else if (network === 'arbitrum') {
                openOrderFromCollBundleId = automationSdk.enums.Bundles.ArbitrumIds.AAVE_V3_OPEN_ORDER_FROM_COLLATERAL;
                openOrderFromDebtStrategyId = automationSdk.enums.Strategies.ArbitrumIds.AAVE_V3_OPEN_ORDER_FROM_DEBT;
            } else if (network === 'optimism') {
                openOrderFromCollBundleId = automationSdk.enums.Bundles.OptimismIds.AAVE_V3_OPEN_ORDER_FROM_COLLATERAL;
                openOrderFromDebtStrategyId = automationSdk.enums.Strategies.OptimismIds.AAVE_V3_OPEN_ORDER_FROM_DEBT;
            }
        };

        before(async () => {
            console.log('isFork', isFork);
            await setUpCallers();
            await setUpContracts();
            await deployStrategies();
            await addBotCaller(botAcc.address, isFork);
        });
        beforeEach(async () => { snapshotId = await takeSnapshot(); });
        afterEach(async () => { await revertToSnapshot(snapshotId); });

        const subToBundle = async (supplyAmountInUsd, supplyCollAsset, ratio, collAsset, debtAsset, subForOpenFromColl) => {
            const market = addrs[network].AAVE_MARKET;
            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', market);
            const poolAddress = await aaveMarketContract.getPool();
            const pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);
            const collReserveData = await pool.getReserveData(collAsset.addresses[chainIds[network]]);
            const debtReserveData = await pool.getReserveData(debtAsset.addresses[chainIds[network]]);

            // 1. Supply coll/debt asset to AaveV3 before subbing
            const supplyAsset = supplyCollAsset ? collAsset : debtAsset;
            const supplyAssetReserveData = supplyCollAsset ? collReserveData : debtReserveData;
            const supplyAmount = await fetchAmountInUSDPrice(supplyAsset.symbol, supplyAmountInUsd);
            await setBalance(supplyAsset.address, senderAcc.address, supplyAmount);
            await aaveV3Supply(
                proxy,
                market,
                supplyAmount,
                supplyAsset.address,
                supplyAssetReserveData.id,
                senderAcc.address,
                senderAcc,
            );

            const currCollPrice = await fetchTokenPriceInUSD('ETH');
            const triggerPrice = currCollPrice.mul(2).div(hre.ethers.BigNumber.from(10).pow(8));

            const isBundle = subForOpenFromColl;
            const strategyOrBundleId = subForOpenFromColl ? openOrderFromCollBundleId : openOrderFromDebtStrategyId;

            // 2. sub to bundle
            const { subId, strategySub } = await subAaveV3OpenOrder(
                proxy,
                strategyOrBundleId,
                collAsset.address,
                collReserveData.id,
                debtAsset.address,
                debtReserveData.id,
                market,
                ratio,
                triggerPrice,
                isBundle,
            );
            return { subId, strategySub };
        };

        /* //////////////////////////////////////////////////////////////
                                     TESTS
        ////////////////////////////////////////////////////////////// */
        it('... should call AaveV3 open order from coll strategy', async () => {
            const supplyCollAsset = true;
            const subForOpenFromColl = true;
            const collAsset = getAssetInfo('WETH', chainIds[network]);
            const debtAsset = getAssetInfo('DAI', chainIds[network]);

            const collAmountInUsd = '50000';
            const borrowAmount = await fetchAmountInUSDPrice(debtAsset.symbol, '34000');
            const ratio = 200;
            const { subId, strategySub } = await subToBundle(
                collAmountInUsd,
                supplyCollAsset,
                ratio,
                collAsset,
                debtAsset,
                subForOpenFromColl,
            );
            const exchangeObject = formatExchangeObj(
                debtAsset.address, collAsset.address, 0, addrs[network].UNISWAP_V3_WRAPPER, 0, 3000,
            );
            await callAaveV3OpenOrderFromCollStrategy(
                strategyExecutor,
                0,
                subId,
                strategySub,
                borrowAmount,
                exchangeObject,
            );
        });
        it('... should call AaveV3 FL Open order from coll strategy', async () => {
            const supplyCollAsset = true;
            const subForOpenFromColl = true;
            const collAsset = getAssetInfo('WETH', chainIds[network]);
            const debtAsset = getAssetInfo('DAI', chainIds[network]);

            const collAmountInUsd = '50000';
            const flAmount = await fetchAmountInUSDPrice(debtAsset.symbol, '50000');
            const ratio = 160;
            const { subId, strategySub } = await subToBundle(
                collAmountInUsd,
                supplyCollAsset,
                ratio,
                collAsset,
                debtAsset,
                subForOpenFromColl,
            );
            const exchangeObject = formatExchangeObj(
                debtAsset.address, collAsset.address, flAmount, addrs[network].UNISWAP_V3_WRAPPER, 0, 3000,
            );
            await callAaveV3FLOpenOrderFromCollStrategy(
                strategyExecutor,
                1,
                subId,
                strategySub,
                flAmount,
                exchangeObject,
                debtAsset.address,
                flAction.address,
            );
        });
        it('... should call AaveV3 FL Open order from debt strategy', async () => {
            // TODO: Remove once deployed
            if (useDeployedStrategies) {
                return;
            }
            const supplyCollAsset = false;
            const subForOpenFromColl = false;
            const collAsset = getAssetInfo('WETH', chainIds[network]);
            const debtAsset = getAssetInfo('DAI', chainIds[network]);

            const supplyDebtAssetAmountInUsd = '20000';
            const withdrawAmount = hre.ethers.constants.MaxUint256;
            const flAmount = await fetchAmountInUSDPrice(debtAsset.symbol, '40000');

            const ratio = 120;
            const { subId, strategySub } = await subToBundle(
                supplyDebtAssetAmountInUsd,
                supplyCollAsset,
                ratio,
                collAsset,
                debtAsset,
                subForOpenFromColl,
            );
            const exchangeObject = formatExchangeObj(
                debtAsset.address, collAsset.address, 0, addrs[network].UNISWAP_V3_WRAPPER, 0, 3000,
            );
            await callAaveV3FLOpenOrderFromDebtStrategy(
                strategyExecutor,
                0,
                subId,
                strategySub,
                flAmount,
                withdrawAmount,
                exchangeObject,
                debtAsset.address,
                flAction.address,
            );
            const proxyDebtBalanceAfter = await balanceOf(debtAsset.address, proxy.address);
            console.log('Proxy debt balance after:', proxyDebtBalanceAfter.toString());
            expect(proxyDebtBalanceAfter).to.be.eq(0);
        });
    });
};

describe('AaveV3 open order strategy test', function () {
    this.timeout(80000);

    const useDeployedStrategies = true;

    it('... test AaveV3 open order strategy', async () => {
        await aaveV3OpenOrderStrategyTest(isNetworkFork(), useDeployedStrategies);
    }).timeout(50000);
});

module.exports = {
    aaveV3OpenOrderStrategyTest,
};
