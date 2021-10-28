const { expect } = require('chai');
const hre = require('hardhat');
const dfs = require('@defisaver/sdk');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    balanceOf,
    WETH_ADDRESS,
    approve,
    depositToWeth,
} = require('../utils');

describe('Sub-Inputs', function () {
    this.timeout(80000);

    let recipeExecutorAddr; let senderAcc; let proxy;

    before(async () => {
        await redeploy('PullToken');
        await redeploy('SubInputs');
        await redeploy('RecipeExecutor');

        recipeExecutorAddr = await getAddrFromRegistry('RecipeExecutor');
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('... should sub two inputs in a recipe', async () => {
        await depositToWeth(hre.ethers.utils.parseUnits('10', 18));
        await approve(WETH_ADDRESS, proxy.address);

        const a = hre.ethers.utils.parseUnits('9', 18);
        const b = hre.ethers.utils.parseUnits('2', 18);
        const testSubInputs = new dfs.Recipe('TestSubInputs', [
            new dfs.actions.basic.SubInputsAction(a, b),
            new dfs.actions.basic.PullTokenAction(WETH_ADDRESS, senderAcc.address, '$1'),
        ]);
        const functionData = testSubInputs.encodeForDsProxyCall()[1];
        const balanceBefore = await balanceOf(WETH_ADDRESS, proxy.address);
        await proxy['execute(address,bytes)'](recipeExecutorAddr, functionData);
        const balanceAfter = await balanceOf(WETH_ADDRESS, proxy.address);
        expect(balanceAfter.sub(balanceBefore)).to.be.eq(hre.ethers.utils.parseUnits('7', 18));
    });

    it('... should revert in event of underflow', async () => {
        await depositToWeth(hre.ethers.utils.parseUnits('10', 18));
        await approve(WETH_ADDRESS, proxy.address);

        const a = hre.ethers.utils.parseUnits('1', 18);
        const b = hre.ethers.utils.parseUnits('5', 18);
        const testSubInputs = new dfs.Recipe('TestSubInputs', [
            new dfs.actions.basic.SubInputsAction(a, b),
            new dfs.actions.basic.PullTokenAction(WETH_ADDRESS, senderAcc.address, '$1'),
        ]);
        const functionData = testSubInputs.encodeForDsProxyCall()[1];

        await expect(proxy['execute(address,bytes)'](recipeExecutorAddr, functionData)).to.be.reverted;
    });
});
