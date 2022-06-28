const hre = require('hardhat');
const { expect } = require('chai');

const { configure } = require('@defisaver/sdk');

const {
    getProxy,
    redeploy,
    redeployCore,
    setBalance,
    openStrategyAndBundleStorage,
    fetchAmountinUSDPrice,
    network,
    addrs,
} = require('../../utils');

const { addBotCaller, createStrategy, createBundle } = require('../../utils-strategies');

const {
    createAaveV3RepayL2Strategy,
    createAaveFLV3RepayL2Strategy,
    createAaveV3BoostL2Strategy,
    createAaveFLV3BoostL2Strategy,
} = require('../../l2-strategies');

const { subAaveV3L2AutomationStrategy } = require('../../l2-strategy-subs');
const {
    callAaveV3RepayL2Strategy,
    callAaveFLV3RepayL2Strategy,
    callAaveV3BoostL2Strategy,
    callAaveFLV3BoostL2Strategy,
} = require('../../l2-strategy-calls');

const {
    aaveV3Supply, aaveV3Borrow,
} = require('../../actions');

const aaveV3RepayL2StrategyTest = async () => {
    describe('AaveV3-Repay-L2-Strategy-Test', function () {
        this.timeout(1200000);

        let senderAcc;
        let proxy;
        let proxyAddr;
        let botAcc;
        let strategyExecutorL2;
        let pool;
        let aaveView;
        let subId;
        let ethAssetId;
        let daiAssetId;
        let flAaveV3Addr;

        before(async () => {
            console.log(`Network: ${network}`);

            configure({
                chainId: 10,
                testMode: true,
            });

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            console.log('proxyAddr: ', proxyAddr);

            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
            const poolAddress = await aaveMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);

            strategyExecutorL2 = await redeployCore(true);

            await redeploy('BotAuth');
            await redeploy('AaveV3RatioTrigger');
            await redeploy('GasFeeTaker');
            await redeploy('DFSSell');
            await redeploy('AaveV3Payback');
            await redeploy('AaveV3Withdraw');
            await redeploy('AaveSubProxy');

            flAaveV3Addr = await redeploy('FLAaveV3');

            aaveView = await redeploy('AaveV3View');

            botAcc = (await hre.ethers.getSigners())[1];
            await addBotCaller(botAcc.address);

            const amount = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('ETH', '20000'), 18);
            await setBalance(addrs[network].WETH_ADDRESS, senderAcc.address, amount);

            const reserveData = await pool.getReserveData(addrs[network].WETH_ADDRESS);
            ethAssetId = reserveData.id;

            await aaveV3Supply(
                proxy,
                addrs[network].AAVE_MARKET,
                amount,
                addrs[network].WETH_ADDRESS,
                ethAssetId,
                senderAcc.address,
            );

            const reserveDataDAI = await pool.getReserveData(addrs[network].DAI_ADDRESS);
            const amountDai = hre.ethers.utils.parseUnits('10000', 18);

            daiAssetId = reserveDataDAI.id;

            await aaveV3Borrow(
                proxy,
                addrs[network].AAVE_MARKET,
                amountDai,
                senderAcc.address,
                2,
                daiAssetId,
            );
        });

        it('... should make a AaveV3 L2 Repay bundle and subscribe', async () => {
            await openStrategyAndBundleStorage();
            const aaveRepayStrategyEncoded = createAaveV3RepayL2Strategy();
            const aaveRepayFLStrategyEncoded = createAaveFLV3RepayL2Strategy();

            const strategyId1 = await createStrategy(proxy, ...aaveRepayStrategyEncoded, true);
            const strategyId2 = await createStrategy(proxy, ...aaveRepayFLStrategyEncoded, true);

            const bundleId = await createBundle(proxy, [strategyId1, strategyId2]);

            console.log('bundleId: ', bundleId);

            const targetRatio = hre.ethers.utils.parseUnits('2.5', '18');
            const ratioUnder = hre.ethers.utils.parseUnits('2.2', '18');

            subId = await subAaveV3L2AutomationStrategy(
                proxy,
                ratioUnder.toHexString().slice(2),
                '0',
                '0',
                targetRatio.toHexString().slice(2),
                false,
            );
        });

        it('... should call AaveV3 L2 Repay strategy', async () => {
            const ratioBefore = await aaveView.getRatio(addrs[network].AAVE_MARKET, proxyAddr);
            console.log(`Aave position ratio: ${ratioBefore / 1e16}%`);

            const repayAmount = hre.ethers.utils.parseUnits('1', 18);
            // eslint-disable-next-line max-len
            await callAaveV3RepayL2Strategy(botAcc, strategyExecutorL2, subId, ethAssetId, daiAssetId, repayAmount, 0);

            const ratioAfter = await aaveView.getRatio(addrs[network].AAVE_MARKET, proxyAddr);
            console.log(`Aave position ratio: ${ratioAfter / 1e16}%`);
            expect(ratioAfter).to.be.gt(ratioBefore);
        });

        it('... should call AaveV3 L2 With FL Repay strategy', async () => {
            const ratioBefore = await aaveView.getRatio(addrs[network].AAVE_MARKET, proxyAddr);
            console.log(`Aave position ratio: ${ratioBefore / 1e16}%`);

            const repayAmount = hre.ethers.utils.parseUnits('1', 18);
            // eslint-disable-next-line max-len
            await callAaveFLV3RepayL2Strategy(
                botAcc,
                strategyExecutorL2,
                subId,
                ethAssetId,
                addrs[network].WETH_ADDRESS,
                daiAssetId,
                repayAmount,
                flAaveV3Addr.address,
                1,
            );

            const ratioAfter = await aaveView.getRatio(addrs[network].AAVE_MARKET, proxyAddr);
            console.log(`Aave position ratio: ${ratioAfter / 1e16}%`);
            expect(ratioAfter).to.be.gt(ratioBefore);
        });
    });
};

const aaveV3BoostL2StrategyTest = async () => {
    describe('AaveV3-Boost-L2-Strategy-Test', function () {
        this.timeout(1200000);

        let senderAcc;
        let proxy;
        let proxyAddr;
        let botAcc;
        let strategyExecutorL2;
        let pool;
        let aaveView;
        let subId;
        let ethAssetId;
        let daiAssetId;
        let flAaveV3Addr;
        let collAddr;
        let debtAddr;

        before(async () => {
            console.log(`Network: ${network}`);

            configure({
                chainId: 10,
                testMode: true,
            });

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            console.log('proxyAddr: ', proxyAddr);

            const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
            const poolAddress = await aaveMarketContract.getPool();

            pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddress);

            strategyExecutorL2 = await redeployCore(true);

            await redeploy('BotAuth');
            await redeploy('AaveV3RatioTrigger');
            await redeploy('GasFeeTaker');
            await redeploy('DFSSell');
            await redeploy('AaveV3Supply');
            await redeploy('AaveV3Borrow');
            await redeploy('AaveSubProxy');

            flAaveV3Addr = await redeploy('FLAaveV3');

            aaveView = await redeploy('AaveV3View');

            botAcc = (await hre.ethers.getSigners())[1];
            await addBotCaller(botAcc.address);

            collAddr = addrs[network].WETH_ADDRESS;
            debtAddr = addrs[network].DAI_ADDRESS;

            const amount = hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('ETH', '25000'), 18);
            await setBalance(collAddr, senderAcc.address, amount);

            const reserveData = await pool.getReserveData(collAddr);
            ethAssetId = reserveData.id;

            await aaveV3Supply(
                proxy,
                addrs[network].AAVE_MARKET,
                amount,
                collAddr,
                ethAssetId,
                senderAcc.address,
            );

            const reserveDataDAI = await pool.getReserveData(debtAddr);
            const amountDai = hre.ethers.utils.parseUnits('10000', 18);

            daiAssetId = reserveDataDAI.id;

            await aaveV3Borrow(
                proxy,
                addrs[network].AAVE_MARKET,
                amountDai,
                senderAcc.address,
                2,
                daiAssetId,
            );
        });

        it('... should make a AaveV3 L2 Boost bundle and subscribe', async () => {
            await openStrategyAndBundleStorage();
            const aaveBoostStrategyEncoded = createAaveV3BoostL2Strategy();
            const aaveBoostFLStrategyEncoded = createAaveFLV3BoostL2Strategy();

            const strategyId1 = await createStrategy(proxy, ...aaveBoostStrategyEncoded, true);
            const strategyId2 = await createStrategy(proxy, ...aaveBoostFLStrategyEncoded, true);

            const bundleId = await createBundle(proxy, [strategyId1, strategyId2]);

            const targetRatio = hre.ethers.utils.parseUnits('1.5', '18');
            const ratioOver = hre.ethers.utils.parseUnits('1.7', '18');

            console.log(ratioOver.toHexString());
            console.log(ratioOver.toString().toString(16));

            subId = await subAaveV3L2AutomationStrategy(
                proxy,
                '0',
                ratioOver.toHexString().slice(2),
                targetRatio.toHexString().slice(2),
                '0',
                true,
            );
        });

        it('... should call AaveV3 L2 Boost strategy', async () => {
            const ratioBefore = await aaveView.getRatio(addrs[network].AAVE_MARKET, proxyAddr);
            console.log(`Aave position ratio: ${ratioBefore / 1e16}%`);

            const boostAmount = hre.ethers.utils.parseUnits('1000', 18);

            await callAaveV3BoostL2Strategy(
                botAcc,
                strategyExecutorL2,
                subId,
                collAddr,
                debtAddr,
                ethAssetId,
                daiAssetId,
                boostAmount,
                0, // strategyIndex
            );

            const ratioAfter = await aaveView.getRatio(addrs[network].AAVE_MARKET, proxyAddr);
            console.log(`Aave position ratio: ${ratioAfter / 1e16}%`);
            expect(ratioAfter).to.be.lt(ratioBefore);
        });

        it('... should call AaveV3 L2 With FL Boost strategy', async () => {
            const ratioBefore = await aaveView.getRatio(addrs[network].AAVE_MARKET, proxyAddr);
            console.log(`Aave position ratio: ${ratioBefore / 1e16}%`);

            const boostAmount = hre.ethers.utils.parseUnits('1000', 18);
            await callAaveFLV3BoostL2Strategy(
                botAcc,
                strategyExecutorL2,
                subId,
                collAddr,
                debtAddr,
                ethAssetId,
                daiAssetId,
                boostAmount,
                flAaveV3Addr.address,
                1, // strategyIndex
            );

            const ratioAfter = await aaveView.getRatio(addrs[network].AAVE_MARKET, proxyAddr);
            console.log(`Aave position ratio: ${ratioAfter / 1e16}%`);
            expect(ratioAfter).to.be.lt(ratioBefore);
        });
    });
};

const l2StrategiesTest = async () => {
    await aaveV3BoostL2StrategyTest();

    await aaveV3RepayL2StrategyTest();
};
module.exports = {
    l2StrategiesTest,
    aaveV3RepayL2StrategyTest,
    aaveV3BoostL2StrategyTest,
};
