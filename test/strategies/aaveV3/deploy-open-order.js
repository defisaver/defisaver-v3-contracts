const hre = require('hardhat');
const { getAssetInfo } = require('@defisaver/tokens');
const {
    getProxy,
    redeploy,
    network,
    addrs,
    getOwnerAddr,
    chainIds,
    fetchTokenPriceInUSD,
    setBalance,
    openStrategyAndBundleStorage,
} = require('../../utils');

const {
    addBotCaller,
    createBundle,
    createStrategy,
} = require('../../utils-strategies');

const { topUp } = require('../../../scripts/utils/fork');
const { subAaveV3OpenOrderFromCollBundle } = require('../../strategy-subs');
const { aaveV3Supply } = require('../../actions');
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

describe('AaveV3-Open-Order-From-Coll-Strategy-Test', function () {
    this.timeout(1200000);

    const REGISTRY_ADDR = addrs[network].REGISTRY_ADDR;

    let proxy;
    let proxyAddr;
    let senderAcc;
    let senderAcc1;
    let senderAcc2;
    let senderAcc3;
    let senderAcc4;
    let senderAcc5;
    let senderAcc6;
    let bundleId = 36;

    const setUpWallet = async () => {
        proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
        proxy = proxy.connect(senderAcc);
        proxyAddr = proxy.address;
    };

    const subToBundle = async () => {
        const market = addrs[network].AAVE_MARKET;
        const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', market);
        const poolAddress = await aaveMarketContract.getPool();
        const pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);

        const wethAsset = getAssetInfo('WETH', chainIds[network]);
        const daiAsset = getAssetInfo('DAI', chainIds[network]);
        const wethReserveData = await pool.getReserveData(wethAsset.addresses[chainIds[network]]);
        const daiReserveData = await pool.getReserveData(daiAsset.addresses[chainIds[network]]);

        // 1. Supply collateral to AaveV3 before subbing
        const supplyAmount = hre.ethers.utils.parseEther('50', 18);
        await setBalance(wethAsset.address, senderAcc.address, supplyAmount);
        await aaveV3Supply(
            proxy,
            market,
            supplyAmount,
            wethAsset.address,
            wethReserveData.id,
            senderAcc.address,
            senderAcc,
        );
        const collAsset = wethAsset.address;
        const collAssetId = wethReserveData.id;
        const debtAsset = daiAsset.address;
        const debtAssetId = daiReserveData.id;
        const targetRatio = hre.ethers.utils.parseUnits('200', 16);
        const rateMode = 2;

        const currCollPrice = await fetchTokenPriceInUSD('ETH');
        console.log('Current WETH price:', currCollPrice.toString());
        const triggerPrice = currCollPrice.mul(2);
        console.log('Trigger price:', triggerPrice.toString());

        // 2. sub to bundle
        const { subId, strategySub } = await subAaveV3OpenOrderFromCollBundle(
            proxy,
            bundleId,
            collAsset,
            collAssetId,
            debtAsset,
            debtAssetId,
            addrs[network].AAVE_MARKET,
            targetRatio,
            triggerPrice,
            rateMode,
        );
        console.log('SubId:', subId);
        console.log('StrategySub:', strategySub);
    };

    before(async () => {
        const isFork = hre.network.name === 'fork';
        console.log('isFork', isFork);

        [
            senderAcc1,
            senderAcc2,
            senderAcc3,
            senderAcc4,
            senderAcc5,
            senderAcc6,
        ] = await hre.ethers.getSigners();

        // ---- Fork setup ----
        const botAcc1 = '0x61fe1bdcd91E8612a916f86bA50a3EDF3E5654c4';
        const botAcc2 = '0xC561281982c3042376eB8242d6A78Ab18062674F';
        const botAcc3 = '0x660B3515F493200C47Ef3DF195abEAfc57Bd6496';
        const botAcc4 = '0xF14e7451A6836725481d8E9042C22117b2039539';
        if (isFork) {
            await topUp(senderAcc1.address);
            await topUp(senderAcc2.address);
            await topUp(senderAcc3.address);
            await topUp(senderAcc4.address);
            await topUp(senderAcc5.address);
            await topUp(senderAcc6.address);
            await topUp(getOwnerAddr());
            await topUp(botAcc1);
            await topUp(botAcc2);
            await topUp(botAcc3);
            await topUp(botAcc4);
        }
        const openRatioCheckAction = await redeploy('AaveV3OpenRatioCheck', REGISTRY_ADDR, false, isFork);
        await addBotCaller(botAcc1, REGISTRY_ADDR, isFork);
        await addBotCaller(botAcc2, REGISTRY_ADDR, isFork);
        await addBotCaller(botAcc3, REGISTRY_ADDR, isFork);
        await addBotCaller(botAcc4, REGISTRY_ADDR, isFork);
        bundleId = await deployOpenOrderFromCollBundle(proxy, isFork);
        console.log('AaveV3OpenRatioCheck address:', openRatioCheckAction.address);
        console.log('BundleId:', bundleId);
        // --------

        senderAcc = senderAcc1;
        await setUpWallet();

        console.log('Sender:', senderAcc.address);
        console.log('Proxy:', proxyAddr);

        await subToBundle();
    });

    it('Deploy on fork', async () => {
    });
});
