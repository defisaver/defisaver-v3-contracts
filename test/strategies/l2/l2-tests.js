const hre = require('hardhat');
const { expect } = require('chai');

const { configure } = require('@defisaver/sdk');

const {
    getProxy,
    redeploy,
    redeployCore,
    setBalance,
    openStrategyAndBundleStorage,
    network,
    addrs,
} = require('../../utils');

const { addBotCaller, createStrategy } = require('../../utils-strategies');

const { createAaveV3RepayL2Strategy } = require('../../l2-strategies');
const { subAaveV3RepayL2Strategy } = require('../../l2-strategy-subs');
const { callAaveV3RepayL2Strategy } = require('../../l2-strategy-calls');

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
        let strategyId;
        let subId;
        let strategySub;
        let ethAssetId;
        let daiAssetId;

        before(async () => {
            console.log(`Network: ${network}`);

            configure({
                chainId: 10,
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

            aaveView = await redeploy('AaveV3View');

            botAcc = (await hre.ethers.getSigners())[1];
            await addBotCaller(botAcc.address);

            const amount = hre.ethers.utils.parseUnits('10', 18);
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
            const strategyData = createAaveV3RepayL2Strategy();
            strategyId = await createStrategy(proxy, ...strategyData, true);

            const targetRatio = hre.ethers.utils.parseUnits('2', '18');
            const ratioUnder = hre.ethers.utils.parseUnits('1.7', '18');

            ({ subId, strategySub } = await subAaveV3RepayL2Strategy(
                proxy,
                strategyId,
                addrs[network].AAVE_MARKET,
                ratioUnder,
                targetRatio,
                false,
            ));
        });

        it('... should call AaveV3 L2 Repay strategy', async () => {
            const ratioBefore = await aaveView.getRatio(addrs[network].AAVE_MARKET, proxyAddr);
            console.log(`Aave position ratio: ${ratioBefore / 1e16}%`);

            const repayAmount = hre.ethers.utils.parseUnits('1', 18);
            // eslint-disable-next-line max-len
            await callAaveV3RepayL2Strategy(botAcc, strategyExecutorL2, subId, strategySub, ethAssetId, daiAssetId, repayAmount);

            const ratioAfter = await aaveView.getRatio(addrs[network].AAVE_MARKET, proxyAddr);
            console.log(`Aave position ratio: ${ratioAfter / 1e16}%`);
            expect(ratioAfter).to.be.gt(ratioBefore);
        });

        it('... should call AaveV3 L2 With FL Repay strategy', async () => {
            const ratioBefore = await aaveView.getRatio(addrs[network].AAVE_MARKET, proxyAddr);
            console.log(`Aave position ratio: ${ratioBefore / 1e16}%`);

            const repayAmount = hre.ethers.utils.parseUnits('1', 18);
            // eslint-disable-next-line max-len
            await callAaveV3RepayL2Strategy(botAcc, strategyExecutorL2, subId, strategySub, ethAssetId, daiAssetId, repayAmount);

            const ratioAfter = await aaveView.getRatio(addrs[network].AAVE_MARKET, proxyAddr);
            console.log(`Aave position ratio: ${ratioAfter / 1e16}%`);
            expect(ratioAfter).to.be.gt(ratioBefore);
        });
    });
};

const l2StrategiesTest = async () => {
    await aaveV3RepayL2StrategyTest();
};
module.exports = {
    l2StrategiesTest,
    aaveV3RepayL2StrategyTest,
};
