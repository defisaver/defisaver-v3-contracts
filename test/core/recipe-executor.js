const { expect } = require('chai');
const hre = require('hardhat');

const dfs = require('@defisaver/sdk');

const {
    redeploy,
    getProxy,
    WETH_ADDRESS,
    placeHolderAddr,
    nullAddress,
    depositToWeth,
    approve,
    balanceOf,
} = require('../utils');

const { createStrategy, addBotCaller, subToStrategy } = require('../utils-strategies.js');

const abiCoder = new hre.ethers.utils.AbiCoder();

const pullAmount = '1000000000000';

// create a dummy strategy so we can test the flow
const addPlaceholderStrategy = async (proxy, maxGasPrice) => {
    const dummyStrategy = new dfs.Strategy('PullTokensStrategy');

    dummyStrategy.addSubSlot('&amount', 'uint256');

    const pullTokenAction = new dfs.actions.basic.PullTokenAction(
        WETH_ADDRESS, '&eoa', '&amount',
    );

    dummyStrategy.addTrigger((new dfs.triggers.GasPriceTrigger(0)));
    dummyStrategy.addAction(pullTokenAction);

    const callData = dummyStrategy.encodeForDsProxyCall();

    await createStrategy(proxy, ...callData, false);

    const amountEncoded = abiCoder.encode(['uint256'], [pullAmount]);

    const triggerData = abiCoder.encode(['uint256'], [maxGasPrice]);
    const strategySub = [0, false, [triggerData], [amountEncoded]];

    await subToStrategy(proxy, strategySub);

    return strategySub;
};

describe('RecipeExecutor', () => {
    let proxy;
    let strategyExecutor;
    let senderAcc;
    let botAcc;
    let strategySub;
    let actionData;
    let triggerData;
    let subProxy;
    let strategyExecutorByBot;
    let maxGasPrice;
    let recipeExecutor;
    let dydxFl;

    before(async () => {
        await redeploy('BotAuth');
        await redeploy('ProxyAuth');
        await redeploy('StrategyStorage');
        await redeploy('SubStorage');
        recipeExecutor = await redeploy('RecipeExecutor');
        subProxy = await redeploy('SubProxy');
        dydxFl = await redeploy('FLDyDx');
        await redeploy('StrategyProxy');
        await redeploy('SendToken');
        await redeploy('WrapEth');
        await redeploy('GasPriceTrigger');
        strategyExecutor = await redeploy('StrategyExecutor');

        senderAcc = (await hre.ethers.getSigners())[0];
        botAcc = (await hre.ethers.getSigners())[1];

        strategyExecutorByBot = strategyExecutor.connect(botAcc);

        proxy = await getProxy(senderAcc.address);

        maxGasPrice = '0';

        strategySub = await addPlaceholderStrategy(proxy, maxGasPrice);

        const pullTokenAction = new dfs.actions.basic.PullTokenAction(
            WETH_ADDRESS, placeHolderAddr, 0,
        );

        actionData = pullTokenAction.encodeForRecipe()[0];
        triggerData = abiCoder.encode(['uint256'], [0]);

        await addBotCaller(botAcc.address);
    });

    it('...should fail to execute recipe by strategy because the triggers check is not passing', async () => {
        try {
            await strategyExecutorByBot.executeStrategy(
                0,
                0,
                [triggerData],
                [actionData],
                strategySub,
                { gasLimit: 5000000 },
            );
            expect(true).to.be.equal(false);
        } catch (err) {
            // trigger error not caught by hardhat but it is throwing it
            // expect(err.toString()).to.have.string('TriggerNotActiveError');
            expect(err.toString()).to.have.string('reverted without a reason string');
        }
    });

    it('...should execute recipe by strategy', async () => {
        // update sub data so trigger will pass
        const amountEncoded = abiCoder.encode(['uint256'], [pullAmount]);
        maxGasPrice = '1000000000000';
        triggerData = abiCoder.encode(['uint256'], [maxGasPrice]);
        strategySub = [0, false, [triggerData], [amountEncoded]];

        const functionData = subProxy.interface.encodeFunctionData('updateSubData',
            [0, [0, false, [triggerData], [amountEncoded]]]);

        await proxy['execute(address,bytes)'](subProxy.address, functionData, {
            gasLimit: 5000000,
        });

        // deposit weth and give allowance to dsproxy for pull action
        await depositToWeth(pullAmount);
        await approve(WETH_ADDRESS, proxy.address);

        const beforeBalance = await balanceOf(WETH_ADDRESS, proxy.address);

        await strategyExecutorByBot.executeStrategy(
            0,
            0,
            [triggerData],
            [actionData],
            strategySub,
            { gasLimit: 5000000 },
        );

        const afterBalance = await balanceOf(WETH_ADDRESS, proxy.address);

        expect(beforeBalance.add(pullAmount)).to.be.eq(afterBalance);
    });

    it('...should execute basic placeholder recipe', async () => {
        const beforeBalance = await balanceOf(WETH_ADDRESS, senderAcc.address);

        const dummyRecipe = new dfs.Recipe('DummyRecipe', [
            new dfs.actions.basic.WrapEthAction(pullAmount),
            new dfs.actions.basic.SendTokenAction(WETH_ADDRESS, senderAcc.address, pullAmount),
        ]);

        const functionData = dummyRecipe.encodeForDsProxyCall();

        await proxy['execute(address,bytes)'](recipeExecutor.address, functionData[1], {
            gasLimit: 3000000,
            value: pullAmount,
        });

        const afterBalance = await balanceOf(WETH_ADDRESS, senderAcc.address);

        expect(beforeBalance.add(pullAmount)).to.be.eq(afterBalance);
    });

    it('...should execute basic recipe with FL', async () => {
        const beforeBalance = await balanceOf(WETH_ADDRESS, senderAcc.address);

        const dummyRecipeWithFL = new dfs.Recipe('DummyRecipeWithFl', [
            // eslint-disable-next-line max-len
            new dfs.actions.flashloan.DyDxFlashLoanAction(pullAmount, WETH_ADDRESS, nullAddress, []),
            new dfs.actions.basic.SendTokenAction(WETH_ADDRESS, dydxFl.address, pullAmount),
        ]);

        const functionData = dummyRecipeWithFL.encodeForDsProxyCall();

        await proxy['execute(address,bytes)'](recipeExecutor.address, functionData[1], {
            gasLimit: 3000000,
        });

        const afterBalance = await balanceOf(WETH_ADDRESS, senderAcc.address);

        expect(beforeBalance).to.be.eq(afterBalance);
    });
});
