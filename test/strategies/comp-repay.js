const hre = require('hardhat');
const { expect } = require('chai');

const dfs = require('@defisaver/sdk');

const { getAssetInfo, assetAmountInWei } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    approve,
    formatExchangeObj,
    fetchAmountinUSDPrice,
    depositToWeth,
    setNewExchangeWrapper,
} = require('../utils');

const {
    getSupplyBalance,
    getCompRatio,
} = require('../utils-comp');

const { createStrategy, addBotCaller } = require('../utils-strategies.js');

const { subCompRepayStrategy, callCompRepayStrategy } = require('../strategies');

const { supplyComp, borrowComp } = require('../actions.js');

describe('Compound-Repay-Strategy', function () {
    this.timeout(120000);

    let senderAcc;
    let proxy;
    let botAcc;
    let strategyExecutor;
    let strategyId;
    let uniWrapper;
    let compView;
    let ratioUnder;
    let targetRatio;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        botAcc = (await hre.ethers.getSigners())[1];
        await redeploy('RecipeExecutor');
        await redeploy('DFSSell');
        compView = await redeploy('CompView');
        uniWrapper = await redeploy('UniswapWrapperV3');
        await redeploy('BotAuth');
        await redeploy('ProxyAuth');
        await redeploy('StrategyStorage');
        await redeploy('SubStorage');
        await redeploy('SubProxy');
        await redeploy('StrategyProxy');
        await redeploy('GasFeeTaker');
        await redeploy('CompSupply');
        await redeploy('CompBorrow');
        await redeploy('CompPayback');
        await redeploy('CompWithdraw');
        await redeploy('CompoundRatioTrigger');
        strategyExecutor = await redeploy('StrategyExecutor');

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
        const compBoostStrategy = new dfs.Strategy('CompBoostStrategy');
        compBoostStrategy.addSubSlot('&proxy', 'address');
        compBoostStrategy.addSubSlot('&targetRatio', 'uint256');

        const compRatioTrigger = new dfs.triggers.CompoundRatioTrigger('0', '0', '0');
        compBoostStrategy.addTrigger(compRatioTrigger);
        const compWithdrawAction = new dfs.actions.compound.CompoundWithdrawAction(
            '%cETH',
            '%amount',
            '&proxy',
        );
        const feeTakingAction = new dfs.actions.basic.GasFeeAction(
            '0', '%wethAddr', '$1',
        );
        const sellAction = new dfs.actions.basic.SellAction(
            formatExchangeObj(
                '%wethAddr',
                '%daiAddr',
                '$2',
                '%exchangeWrapper',
            ),
            '&proxy',
            '&proxy',
        );
        const paybackAction = new dfs.actions.compound.CompoundPaybackAction(
            '%cDai',
            '$3',
            '&proxy',
        );
        compBoostStrategy.addAction(compWithdrawAction);
        compBoostStrategy.addAction(feeTakingAction);
        compBoostStrategy.addAction(sellAction);
        compBoostStrategy.addAction(paybackAction);

        const callData = compBoostStrategy.encodeForDsProxyCall();

        await createStrategy(proxy, ...callData, true);

        targetRatio = hre.ethers.utils.parseUnits('4', '18');
        ratioUnder = hre.ethers.utils.parseUnits('3', '18');

        strategyId = await subCompRepayStrategy(proxy, ratioUnder, targetRatio);
        // sub strategy
    });

    it('... should trigger a Comp boost strategy', async () => {
        const ratioBefore = await getCompRatio(compView, proxy.address);
        console.log(ratioBefore.toString());
        expect(ratioBefore).to.be.lt(ratioUnder);
        const repayAmount = hre.ethers.utils.parseUnits('1.5', 18);
        await callCompRepayStrategy(botAcc, strategyExecutor, strategyId, repayAmount);

        const ratioAfter = await getCompRatio(compView, proxy.address);
        console.log(ratioAfter.toString());
        expect(ratioAfter).to.be.gt(targetRatio);
    });
});
