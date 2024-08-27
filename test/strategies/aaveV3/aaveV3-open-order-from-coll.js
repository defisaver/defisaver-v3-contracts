/* eslint-disable max-len */
const hre = require('hardhat');
const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
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
} = require('../../utils');

const {
    addBotCaller,
    createStrategy,
    createBundle,
} = require('../../utils-strategies');

const {
    aaveV3Supply,
} = require('../../actions');

const { topUp } = require('../../../scripts/utils/fork');
const { subAaveV3OpenOrderFromCollBundle } = require('../../strategy-subs');
const { callAaveV3OpenOrderFromCollStrategy, callAaveV3FLOpenOrderFromCollStrategy } = require('../../strategy-calls');
const { createAaveV3OpenOrderFromCollStrategy, createAaveV3FLOpenOrderFromCollStrategy } = require('../../strategies');

const deployOpenOrderFromCollBundle = async (proxy, isFork) => {
    await openStrategyAndBundleStorage(isFork);

    const openStrategy = createAaveV3OpenOrderFromCollStrategy();
    const flOpenStrategy = createAaveV3FLOpenOrderFromCollStrategy();
    const aaveV3OpenOrderFromCollStrategyId = await createStrategy(
        proxy,
        ...openStrategy,
        false,
    );
    const aaveV3FLOpenOrderFromCollStrategyId = await createStrategy(
        proxy,
        ...flOpenStrategy,
        false,
    );
    const aaveV3OpenOrderFromCollBundleId = await createBundle(
        proxy,
        [aaveV3OpenOrderFromCollStrategyId, aaveV3FLOpenOrderFromCollStrategyId],
    );
    return aaveV3OpenOrderFromCollBundleId;
};

const aaveV3OpenOrderFromCollStrategyTest = async (isFork) => {
    describe('AaveV3-Open-Order-From-Coll-Strategy-Test', function () {
        this.timeout(1200000);

        const REGISTRY_ADDR = addrs[network].REGISTRY_ADDR;

        let snapshotId;
        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let flAction;

        let bundleId = 36;

        before(async () => {
            console.log('isFork', isFork);

            [senderAcc, botAcc] = await hre.ethers.getSigners();
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);

            if (isFork) {
                await topUp(senderAcc.address);
                await topUp(botAcc.address);
                await topUp(getOwnerAddr());
            }
            await redeploy('AaveV3OpenRatioCheck', REGISTRY_ADDR, false, isFork);

            strategyExecutor = await getContractFromRegistry('StrategyExecutor', REGISTRY_ADDR, false, isFork);
            strategyExecutor = strategyExecutor.connect(botAcc);
            flAction = await getContractFromRegistry('FLAction', REGISTRY_ADDR, false, isFork);
            bundleId = await deployOpenOrderFromCollBundle(proxy, isFork);
            await addBotCaller(botAcc.address, REGISTRY_ADDR, isFork);
        });

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });
        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        const subToBundle = async (collAmountInUsd, ratio, collAsset, debtAsset) => {
            const market = addrs[network].AAVE_MARKET;
            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', market);
            const poolAddress = await aaveMarketContract.getPool();
            const pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);
            const collReserveData = await pool.getReserveData(collAsset.addresses[chainIds[network]]);
            const debtReserveData = await pool.getReserveData(debtAsset.addresses[chainIds[network]]);

            // 1. Supply collateral to AaveV3 before subbing
            const supplyAmount = await fetchAmountInUSDPrice(collAsset.symbol, collAmountInUsd);
            await setBalance(collAsset.address, senderAcc.address, supplyAmount);
            await aaveV3Supply(
                proxy,
                market,
                supplyAmount,
                collAsset.address,
                collReserveData.id,
                senderAcc.address,
                senderAcc,
            );

            const targetRatio = hre.ethers.utils.parseUnits(ratio, 16);
            const rateMode = 2;
            const currCollPrice = await fetchTokenPriceInUSD('ETH');
            console.log('Current WETH price:', currCollPrice.toString());
            const triggerPrice = currCollPrice.mul(2);
            console.log('Trigger price:', triggerPrice.toString());

            // 2. sub to bundle
            const { subId, strategySub } = await subAaveV3OpenOrderFromCollBundle(
                proxy,
                bundleId,
                collAsset.address,
                collReserveData.id,
                debtAsset.address,
                debtReserveData.id,
                market,
                targetRatio,
                triggerPrice,
                rateMode,
            );
            console.log('SubId:', subId);
            console.log('StrategySub:', strategySub);
            return { subId, strategySub };
        };
        it('... should call AaveV3 open order from coll strategy', async () => {
            const collAsset = getAssetInfo('WETH', chainIds[network]);
            const debtAsset = getAssetInfo('DAI', chainIds[network]);

            const collAmountInUsd = '50000';
            const borrowAmount = await fetchAmountInUSDPrice(debtAsset.symbol, '32500');
            const ratio = '200';
            const { subId, strategySub } = await subToBundle(
                collAmountInUsd,
                ratio,
                collAsset,
                debtAsset,
            );
            const exchangeObject = formatExchangeObj(
                debtAsset.address,
                collAsset.address,
                '0',
                addrs[network].UNISWAP_V3_WRAPPER,
                0,
                3000, // uniV3 fee
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
            const collAsset = getAssetInfo('WETH', chainIds[network]);
            const debtAsset = getAssetInfo('DAI', chainIds[network]);

            const collAmountInUsd = '50000';
            const flAmount = await fetchAmountInUSDPrice(debtAsset.symbol, '50000');
            const ratio = '160';
            const { subId, strategySub } = await subToBundle(
                collAmountInUsd,
                ratio,
                collAsset,
                debtAsset,
            );
            const exchangeObject = formatExchangeObj(
                debtAsset.address,
                collAsset.address,
                flAmount,
                addrs[network].UNISWAP_V3_WRAPPER,
                0,
                3000, // uniV3 fee
            );
            console.log('fl action:', flAction.address);
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
    });
};

describe('AaveV3 open order from coll strategy test', function () {
    this.timeout(80000);

    it('... test AaveV3 open order from coll', async () => {
        await aaveV3OpenOrderFromCollStrategyTest(isNetworkFork());
    }).timeout(50000);
});

module.exports = {
    aaveV3OpenOrderFromCollStrategyTest,
};
