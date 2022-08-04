const hre = require('hardhat');
const { expect } = require('chai');

const { getAssetInfo, assetAmountInWei } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    approve,
    fetchAmountinUSDPrice,
    depositToWeth,
    setNewExchangeWrapper,
    openStrategyAndBundleStorage,
    redeployCore,
} = require('../../utils');

const {
    getSupplyBalance,
    getCompRatio,
} = require('../../utils-comp');

const { createStrategy, addBotCaller } = require('../../utils-strategies');

const { callCompBoostStrategy, callCompRepayStrategy } = require('../../strategy-calls');
const { subCompBoostStrategy, subCompRepayStrategy } = require('../../strategy-subs');
const { createBoostStrategy, createCompRepayStrategy } = require('../../strategies');

const { supplyComp, borrowComp } = require('../../actions');

const compBoostStrategyTest = async () => {
    describe('Compound-Boost-Strategy', function () {
        this.timeout(120000);

        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let subId;
        let strategySub;
        let uniWrapper;
        let compView;
        let ratioOver;
        let targetRatio;
        let strategyId;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc = (await hre.ethers.getSigners())[1];

            compView = await redeploy('CompView');

            strategyExecutor = await redeployCore();

            await redeploy('DFSSell');
            await redeploy('FLDyDx');
            await redeploy('FLAaveV2');
            await redeploy('GasFeeTaker');
            await redeploy('CompSupply');
            await redeploy('CompBorrow');
            await redeploy('CompoundRatioTrigger');
            uniWrapper = await redeploy('UniswapWrapperV3');

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);

            await setNewExchangeWrapper(senderAcc, uniWrapper.address);
            await addBotCaller(botAcc.address);

            const supplyBalance = await getSupplyBalance(compView, proxy.address, getAssetInfo('cETH').address);
            if (supplyBalance.lt(assetAmountInWei('20', 'ETH'))) {
                let initialCollAmount = fetchAmountinUSDPrice('WETH', '35000');
                initialCollAmount = hre.ethers.utils.parseUnits(initialCollAmount, 18);
                const initialBorrowAmount = hre.ethers.utils.parseUnits('10000', 18);
                await approve(getAssetInfo('WETH').address, proxy.address);
                await depositToWeth(initialCollAmount);
                console.log(`supplying ${initialCollAmount}`);
                await supplyComp(proxy, getAssetInfo('cETH').address, getAssetInfo('WETH').address, initialCollAmount, senderAcc.address);
                console.log(`borrowing ${initialBorrowAmount}`);
                await borrowComp(proxy, getAssetInfo('cDAI').address, initialBorrowAmount, senderAcc.address);
            }
        });

        it('... should make a new Comp Boost strategy', async () => {
            await openStrategyAndBundleStorage();
            const strategyData = createBoostStrategy();
            strategyId = await createStrategy(proxy, ...strategyData, true);

            targetRatio = hre.ethers.utils.parseUnits('2.1', '18');
            ratioOver = hre.ethers.utils.parseUnits('2.5', '18');

            ({ subId, strategySub } = await subCompBoostStrategy(
                proxy,
                ratioOver,
                targetRatio,
                strategyId,
            ));
        });

        it('... should trigger a Comp boost strategy', async () => {
            const ratioBefore = await getCompRatio(compView, proxy.address);
            console.log(ratioBefore.toString());
            // expect(ratioBefore).to.be.gt(ratioOver);
            const boostAmount = hre.ethers.utils.parseUnits('12000', 18);
            await callCompBoostStrategy(botAcc, strategyExecutor, subId, strategySub, boostAmount);

            const ratioAfter = await getCompRatio(compView, proxy.address);
            console.log(ratioAfter.toString());
            expect(ratioAfter).to.be.lt(ratioBefore);
        });
    });
};

const compRepayStrategyTest = async () => {
    describe('Compound-Repay-Strategy', function () {
        this.timeout(120000);

        let senderAcc;
        let proxy;
        let botAcc;
        let strategyExecutor;
        let subId;
        let strategySub;
        let uniWrapper;
        let compView;
        let ratioUnder;
        let targetRatio;
        let strategyId;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc = (await hre.ethers.getSigners())[1];

            await redeploy('DFSSell');
            compView = await redeploy('CompView');
            uniWrapper = await redeploy('UniswapWrapperV3');
            await redeploy('GasFeeTaker');
            await redeploy('CompSupply');
            await redeploy('CompBorrow');
            await redeploy('CompPayback');
            await redeploy('CompWithdraw');
            await redeploy('CompoundRatioTrigger');

            strategyExecutor = await redeployCore();

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);

            await setNewExchangeWrapper(senderAcc, uniWrapper.address);
            await addBotCaller(botAcc.address);

            const supplyBalance = await getSupplyBalance(compView, proxy.address, getAssetInfo('cETH').address);
            if (supplyBalance.lt(assetAmountInWei('20', 'ETH'))) {
                let initialCollAmount = fetchAmountinUSDPrice('WETH', '35000');
                initialCollAmount = hre.ethers.utils.parseUnits(initialCollAmount, 18);
                const initialBorrowAmount = hre.ethers.utils.parseUnits('10000', 18);
                await approve(getAssetInfo('WETH').address, proxy.address);
                await depositToWeth(initialCollAmount);
                console.log(`supplying ${initialCollAmount}`);
                await supplyComp(proxy, getAssetInfo('cETH').address, getAssetInfo('WETH').address, initialCollAmount, senderAcc.address);
                console.log(`borrowing ${initialBorrowAmount}`);
                await borrowComp(proxy, getAssetInfo('cDAI').address, initialBorrowAmount, senderAcc.address);
            }
        });

        it('... should make a new Comp Repay strategy', async () => {
            const strategyData = createCompRepayStrategy();
            await openStrategyAndBundleStorage();

            strategyId = await createStrategy(proxy, ...strategyData, true);

            targetRatio = hre.ethers.utils.parseUnits('3.8', '18');
            ratioUnder = hre.ethers.utils.parseUnits('3', '18');

            ({ subId, strategySub } = await subCompRepayStrategy(
                proxy,
                ratioUnder,
                targetRatio,
                strategyId,
            ));
        });

        it('... should trigger a Comp repay strategy', async () => {
            const ratioBefore = await getCompRatio(compView, proxy.address);
            console.log(ratioBefore.toString());
            // expect(ratioBefore).to.be.lt(ratioUnder);
            const repayAmount = hre.ethers.utils.parseUnits('1.5', 18);
            await callCompRepayStrategy(botAcc, strategyExecutor, subId, strategySub, repayAmount);

            const ratioAfter = await getCompRatio(compView, proxy.address);
            console.log(ratioAfter.toString());
            expect(ratioAfter).to.be.gt(targetRatio);
        });
    });
};

const compoundStrategiesTest = async () => {
    await compBoostStrategyTest();
    await compRepayStrategyTest();
};
module.exports = {
    compoundStrategiesTest,
    compBoostStrategyTest,
    compRepayStrategyTest,
};
