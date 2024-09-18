/* eslint-disable max-len */
/* eslint-disable no-await-in-loop */

/* //////////////////////////////////////////////////////////////
                        START PARAMS
////////////////////////////////////////////////////////////// */
const ONLY_DEPLOY_BUNDLES = true;

const USER_ID = 1; // value 1-5 to re-use same fork
const SUB_TO_OPEN_ORDER_FROM_COLL = true;
const COLLATERAL_TOKEN = 'WETH';
const DEBT_TOKEN = 'DAI';
const SUPPLY_TOKEN_DECIMALS = 18;
const SUPPLY_TOKEN_AMOUNT = '50';
const INITIAL_DEBT_TOKEN = 'DAI';
const INITIAL_DEBT_AMOUNT = '30000'; // 30k DAI
const TARGET_RATIO = 130;
const TRIGGER_PRICE = 4000; // 1 DAI = 0.0006 ETH, or e.g put 1 WETH = 4000 DAI if ETH/DAI position

/* //////////////////////////////////////////////////////////////
                        END PARAMS
////////////////////////////////////////////////////////////// */

require('dotenv-safe').config();
const hre = require('hardhat');
const { getAssetInfo } = require('@defisaver/tokens');
const {
    getProxy,
    redeploy,
    network,
    addrs,
    getOwnerAddr,
    chainIds,
    openStrategyAndBundleStorage,
    getNetwork,
    setBalance,
} = require('../../utils');

const {
    addBotCaller,
    createBundle,
    createStrategy,
} = require('../../utils-strategies');

const { topUp } = require('../../../scripts/utils/fork');
const { subAaveV3OpenOrder } = require('../../strategy-subs');
const { aaveV3Supply, aaveV3Borrow } = require('../../actions');
const { createAaveV3OpenOrderFromCollStrategy, createAaveV3FLOpenOrderFromCollStrategy, createAaveV3FLOpenOrderFromDebtStrategy } = require('../../strategies');
const { createAaveV3OpenOrderFromCollL2Strategy, createAaveV3FLOpenOrderFromCollL2Strategy, createAaveV3FLOpenOrderFromDebtL2Strategy } = require('../../l2-strategies');

const deployOpenOrderFromCollBundle = async (proxy, isFork) => {
    await openStrategyAndBundleStorage(isFork);

    const openStrategy = getNetwork() === 'mainnet' ? createAaveV3OpenOrderFromCollStrategy() : createAaveV3OpenOrderFromCollL2Strategy();
    const flOpenStrategy = getNetwork() === 'mainnet' ? createAaveV3FLOpenOrderFromCollStrategy() : createAaveV3FLOpenOrderFromCollL2Strategy();
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

const deployOpenOrderFromDebtStrategy = async (proxy, isFork) => {
    await openStrategyAndBundleStorage(isFork);

    const openStrategy = getNetwork() === 'mainnet' ? createAaveV3FLOpenOrderFromDebtStrategy() : createAaveV3FLOpenOrderFromDebtL2Strategy();
    const aaveV3FLOpenOrderFromDebtStrategyId = await createStrategy(
        proxy,
        ...openStrategy,
        false,
    );
    return aaveV3FLOpenOrderFromDebtStrategyId;
};

describe('Deploy open order strategies on fork', function () {
    this.timeout(1200000);

    const REGISTRY_ADDR = addrs[network].REGISTRY_ADDR;

    let proxy;
    let senderAcc;
    let senderAcc1;
    let senderAcc2;
    let senderAcc3;
    let senderAcc4;
    let senderAcc5;

    let openOrderFromCollBundleId;
    let openOrderFromDebtStrategyId;

    const setUpWallet = async () => {
        proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
        proxy = proxy.connect(senderAcc);
    };

    const subToBundle = async (supplyAmount, supplyCollAsset, ratio, collAsset, debtAsset, subForOpenFromColl) => {
        const market = addrs[network].AAVE_MARKET;
        const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', market);
        const poolAddress = await aaveMarketContract.getPool();
        const pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);
        const collReserveData = await pool.getReserveData(collAsset.addresses[chainIds[network]]);
        const debtReserveData = await pool.getReserveData(debtAsset.addresses[chainIds[network]]);

        // 1. Supply coll/debt asset to AaveV3 before subbing
        const supplyAsset = supplyCollAsset ? collAsset : debtAsset;
        const supplyAssetReserveData = supplyCollAsset ? collReserveData : debtReserveData;
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

        const initialTokenAsset = getAssetInfo(INITIAL_DEBT_TOKEN);
        const initialDebtReserveData = await pool.getReserveData(initialTokenAsset.address);
        const initialBorrowAmount = hre.ethers.utils.parseUnits(INITIAL_DEBT_AMOUNT, initialTokenAsset.decimals);
        await aaveV3Borrow(
            proxy,
            market,
            initialBorrowAmount,
            senderAcc.address,
            2,
            initialDebtReserveData.id,
        );

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
            TRIGGER_PRICE,
            isBundle,
        );
        console.log('SubId:', subId);
        console.log('StrategySub:', strategySub);
        return { subId, strategySub };
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
        ] = await hre.ethers.getSigners();

        const mainnetBocAccounts = [
            '0x61fe1bdcd91E8612a916f86bA50a3EDF3E5654c4',
            '0xC561281982c3042376eB8242d6A78Ab18062674F',
            '0x660B3515F493200C47Ef3DF195abEAfc57Bd6496',
            '0xF14e7451A6836725481d8E9042C22117b2039539',
            '0xB1E5d1260A63163cdCC114cceD9bC0659de96EB8',
            '0x36229a6999EEEb5217482299A6f6eeC76641757B',
        ];
        const l2BotAccounts = [
            '0x61fe1bdcd91E8612a916f86bA50a3EDF3E5654c4',
            '0xC561281982c3042376eB8242d6A78Ab18062674F',
        ];
        const botAccounts = getNetwork() === 'mainnet' ? mainnetBocAccounts : l2BotAccounts;

        // ---- Fork setup ----
        if (isFork) {
            await topUp(senderAcc1.address);
            await topUp(senderAcc2.address);
            await topUp(senderAcc3.address);
            await topUp(senderAcc4.address);
            await topUp(senderAcc5.address);
            await topUp(getOwnerAddr());
            for (let i = 0; i < botAccounts.length; i++) {
                await topUp(botAccounts[i]);
            }
        }
        await redeploy('AaveV3OpenRatioCheck', REGISTRY_ADDR, false, isFork);
        for (let i = 0; i < botAccounts.length; i++) {
            await addBotCaller(botAccounts[i], REGISTRY_ADDR, isFork);
        }
        openOrderFromCollBundleId = await deployOpenOrderFromCollBundle(proxy, isFork);
        openOrderFromDebtStrategyId = await deployOpenOrderFromDebtStrategy(proxy, isFork);

        if (USER_ID === 1) senderAcc = senderAcc1;
        if (USER_ID === 2) senderAcc = senderAcc2;
        if (USER_ID === 3) senderAcc = senderAcc3;
        if (USER_ID === 4) senderAcc = senderAcc4;
        if (USER_ID === 5) senderAcc = senderAcc5;

        console.log('OpenOrderFromCollBundleId:', openOrderFromCollBundleId);
        console.log('OpenOrderFromDebtStrategyId:', openOrderFromDebtStrategyId);
        console.log('Sender:', senderAcc.address);

        if (!ONLY_DEPLOY_BUNDLES) {
            await setUpWallet();
            console.log('Proxy:', proxy.address);
            const collAsset = getAssetInfo(COLLATERAL_TOKEN, chainIds[network]);
            const debtAsset = getAssetInfo(DEBT_TOKEN, chainIds[network]);
            const supplyAmount = hre.ethers.utils.parseUnits(SUPPLY_TOKEN_AMOUNT, SUPPLY_TOKEN_DECIMALS);

            await subToBundle(
                supplyAmount,
                SUB_TO_OPEN_ORDER_FROM_COLL,
                TARGET_RATIO,
                collAsset,
                debtAsset,
                SUB_TO_OPEN_ORDER_FROM_COLL,
            );
        }

        const currentBlockNumber = await hre.ethers.provider.getBlockNumber();

        console.log('#######################################################################');
        console.log('\n');
        console.log(`make fork-automation-cli-dont-delete-db rpc=https://rpc.tenderly.co/fork/${process.env.FORK_ID} env=dev block=${currentBlockNumber - 11} net=mainnet publickey=asd`);
        console.log('\n');
        console.log('#######################################################################');

        // const aaveV3View = await getContractFromRegistry('AaveV3View', REGISTRY_ADDR, false, isFork);
        // const res = await aaveV3View.getSafetyRatio(addrs[network].AAVE_MARKET, proxyAddr);
        // console.log(res);
    });

    it('Deploy on fork', async () => {});
});
