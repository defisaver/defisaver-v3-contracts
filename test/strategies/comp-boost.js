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
} = require('../utils');

const {
    getSupplyBalance,
    getCompRatio,
} = require('../utils-comp');

const { createStrategy, addBotCaller } = require('../utils-strategies.js');

const { callCompBoostStrategy } = require('../strategy-calls');
const { subCompBoostStrategy } = require('../strategy-subs');
const { createBoostStrategy } = require('../strategies');

const { supplyComp, borrowComp } = require('../actions.js');

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

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        botAcc = (await hre.ethers.getSigners())[1];

        await redeploy('RecipeExecutor');
        await redeploy('DFSSell');
        await redeploy('FLDyDx');
        await redeploy('FLAaveV2');
        compView = await redeploy('CompView');
        await redeploy('BotAuth');
        await redeploy('ProxyAuth');
        await redeploy('StrategyStorage');
        await redeploy('SubStorage');
        await redeploy('SubProxy');
        await redeploy('StrategyProxy');
        await redeploy('RecipeExecutor');
        await redeploy('GasFeeTaker');
        await redeploy('CompSupply');
        await redeploy('CompBorrow');
        await redeploy('CompoundRatioTrigger');
        strategyExecutor = await redeploy('StrategyExecutor');
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
        const strategyData = createBoostStrategy();
        await createStrategy(proxy, ...strategyData, true);

        targetRatio = hre.ethers.utils.parseUnits('2.1', '18');
        ratioOver = hre.ethers.utils.parseUnits('2.5', '18');

        ({ subId, strategySub } = await subCompBoostStrategy(proxy, ratioOver, targetRatio));
        // sub strategy
    });

    it('... should trigger a Comp boost strategy', async () => {
        const ratioBefore = await getCompRatio(compView, proxy.address);
        console.log(ratioBefore.toString());
        expect(ratioBefore).to.be.gt(ratioOver);
        const boostAmount = hre.ethers.utils.parseUnits('12000', 18);
        await callCompBoostStrategy(botAcc, strategyExecutor, subId, strategySub, boostAmount);

        const ratioAfter = await getCompRatio(compView, proxy.address);
        console.log(ratioAfter.toString());
        expect(ratioAfter).to.be.lt(targetRatio);
    });
});
