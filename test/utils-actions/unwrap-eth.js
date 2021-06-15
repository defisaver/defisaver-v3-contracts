const { expect } = require('chai');
const hre = require('hardhat');

const dfs = require('@defisaver/sdk');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    send,
    balanceOf,
    ETH_ADDR,
    WETH_ADDRESS,
    setNewExchangeWrapper,
    depositToWeth,
    sendEther,
} = require('../utils');

// TODO: test when amount == uint.max

describe('Unwrap-Eth', function () {
    this.timeout(80000);

    let senderAcc; let proxy; let
        uniWrapper; let RecipeExecutorAddr;

    before(async () => {
        await redeploy('WrapEth');
        await redeploy('UnwrapEth');
        await redeploy('DFSSell');
        uniWrapper = await redeploy('UniswapWrapperV3');
        await redeploy('RecipeExecutor');

        RecipeExecutorAddr = await getAddrFromRegistry('RecipeExecutor');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        await setNewExchangeWrapper(senderAcc, uniWrapper.address);
    });
    it('... should unwrap native WEth to Eth direct action', async () => {
        const unwrapEthAddr = await getAddrFromRegistry('UnwrapEth');

        const amount = hre.ethers.utils.parseUnits('2', 18);
        await depositToWeth(amount);

        await send(WETH_ADDRESS, proxy.address, amount);

        const unwrapEthAction = new dfs.actions.basic.UnwrapEthAction(amount, senderAcc.address);
        const functionData = unwrapEthAction.encodeForDsProxyCall()[1];

        const ethBalanceBefore = await balanceOf(ETH_ADDR, senderAcc.address);
        console.log(`Eth proxy before: ${ethBalanceBefore / 1e18}`);

        await proxy['execute(address,bytes)'](unwrapEthAddr, functionData, { gasLimit: 3000000 });

        const ethBalanceAfter = await balanceOf(ETH_ADDR, senderAcc.address);
        console.log(`Eth proxy after: ${ethBalanceAfter / 1e18}`);

        expect(ethBalanceAfter / 1e18).to.be.gt(ethBalanceBefore / 1e18);
    });

    it('... should unwrap weth -> eth in a recipe', async () => {
        const amount = hre.ethers.utils.parseUnits('2', 18);

        await sendEther(senderAcc, proxy.address, '2');

        const unwrapRecipe = new dfs.Recipe('UnwrapRecipe', [
            new dfs.actions.basic.WrapEthAction(amount),
            new dfs.actions.basic.UnwrapEthAction(amount, senderAcc.address),
        ]);

        const functionData = unwrapRecipe.encodeForDsProxyCall();

        const ethBalanceBefore = await balanceOf(ETH_ADDR, senderAcc.address);
        console.log(`Eth proxy before: ${ethBalanceBefore / 1e18}`);

        await proxy['execute(address,bytes)'](RecipeExecutorAddr, functionData[1], { gasLimit: 3000000 });

        const ethBalanceAfter = await balanceOf(ETH_ADDR, senderAcc.address);
        console.log(`Eth proxy after: ${ethBalanceAfter / 1e18}`);

        expect(ethBalanceAfter / 1e18).to.be.gt(ethBalanceBefore / 1e18);
    });
});
