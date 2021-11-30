const { expect } = require('chai');
const hre = require('hardhat');

const dfs = require('@defisaver/sdk');

const {
    redeploy,
    getProxy,
    WETH_ADDRESS,
    placeHolderAddr,
    depositToWeth,
    approve,
    balanceOf,
} = require('../utils');

const { createStrategy, addBotCaller, subToStrategy } = require('../utils-strategies.js');

const abiCoder = new hre.ethers.utils.AbiCoder();

const pullAmount = '1000000000000';

// create a dummy strategy so we can test the flow
const addPlaceholderStrategy = async (proxy) => {
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

    const maxGasPrice = '1000000000000000000'; // large num for condition to pass
    const triggerData = abiCoder.encode(['uint256'], [maxGasPrice]);
    const strategySub = [0, false, [triggerData], [amountEncoded]];

    await subToStrategy(proxy, strategySub);

    return strategySub;
};

describe('StrategyExecutor', () => {
    let proxy;
    let strategyExecutor;
    let senderAcc;
    let botAcc;
    let strategySub;
    let actionData;
    let triggerData;
    let subProxy;
    let strategyExecutorByBot;

    before(async () => {
        await redeploy('BotAuth');
        await redeploy('ProxyAuth');
        await redeploy('StrategyStorage');
        await redeploy('SubStorage');
        await redeploy('RecipeExecutor');
        subProxy = await redeploy('SubProxy');
        await redeploy('StrategyProxy');
        await redeploy('PullToken');
        await redeploy('GasPriceTrigger');
        strategyExecutor = await redeploy('StrategyExecutor');

        senderAcc = (await hre.ethers.getSigners())[0];
        botAcc = (await hre.ethers.getSigners())[1];

        strategyExecutorByBot = strategyExecutor.connect(botAcc);

        proxy = await getProxy(senderAcc.address);

        strategySub = await addPlaceholderStrategy(proxy);

        const pullTokenAction = new dfs.actions.basic.PullTokenAction(
            WETH_ADDRESS, placeHolderAddr, 0,
        );

        actionData = pullTokenAction.encodeForRecipe()[0];
        triggerData = abiCoder.encode(['uint256'], [0]);
    });

    it('...should fail because caller is not auth bot', async () => {
        try {
            await strategyExecutor.executeStrategy(
                0,
                0,
                [triggerData],
                [actionData],
                strategySub,
            );
            expect(true).to.be.equal(false);
        } catch (err) {
            expect(err.toString()).to.have.string('BotNotApproved');
        }
    });

    it('...should fail because of wrong SubData hash', async () => {
        try {
            await addBotCaller(botAcc.address);

            const amountEncoded = abiCoder.encode(['uint256'], [pullAmount]);
            // isBundle changed to true
            const strategySubUpdated = [0, true, [triggerData], [amountEncoded]];

            await strategyExecutorByBot.executeStrategy(
                0,
                0,
                [triggerData],
                [actionData],
                strategySubUpdated,
            );
            expect(true).to.be.equal(false);
        } catch (err) {
            expect(err.toString()).to.have.string('SubDatHashMismatch');
        }
    });

    it('...should fail because subscription is not enabled', async () => {
        try {
            // disable sub
            const functionData = subProxy.interface.encodeFunctionData('deactivateSub', [0]);
            await proxy['execute(address,bytes)'](subProxy.address, functionData, {
                gasLimit: 5000000,
            });

            await strategyExecutorByBot.executeStrategy(
                0,
                0,
                [triggerData],
                [actionData],
                strategySub,
            );
            expect(true).to.be.equal(false);
        } catch (err) {
            expect(err.toString()).to.have.string('SubNotEnabled(0)');
        }

        // enable sub
        const functionData = subProxy.interface.encodeFunctionData('activateSub', [0]);
        await proxy['execute(address,bytes)'](subProxy.address, functionData, {
            gasLimit: 5000000,
        });
    });

    it('...should execute the placeholder strategies once all conditions are met', async () => {
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
});
