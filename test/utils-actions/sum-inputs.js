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

describe('Sum-Inputs', function () {
    this.timeout(80000);

    let RecipeExecutorAddr; let senderAcc; let proxy;

    before(async () => {
        await redeploy('PullToken');
        await redeploy('SumInputs');
        await redeploy('RecipeExecutor');

        RecipeExecutorAddr = await getAddrFromRegistry('RecipeExecutor');
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('... should sum two inputs in a recipe', async () => {
        await depositToWeth(hre.ethers.utils.parseUnits('10', 18));
        await approve(WETH_ADDRESS, proxy.address);

        const a = hre.ethers.utils.parseUnits('2', 18);
        const b = hre.ethers.utils.parseUnits('7', 18);
        const testSumInputs = new dfs.Recipe('TestSumInputs', [
            new dfs.actions.basic.SumInputsAction(a, b),
            new dfs.actions.basic.PullTokenAction(WETH_ADDRESS, senderAcc.address, '$1'),
        ]);
        const functionData = testSumInputs.encodeForDsProxyCall()[1];

        await proxy['execute(address,bytes)'](RecipeExecutorAddr, functionData);

        expect(await balanceOf(WETH_ADDRESS, proxy.address)).to.be.eq(hre.ethers.utils.parseUnits('9', 18));
    });

    it('... should revert in event of overflow', async () => {
        await depositToWeth(hre.ethers.utils.parseUnits('10', 18));
        await approve(WETH_ADDRESS, proxy.address);

        const a = hre.ethers.utils.parseUnits('1', 18);
        const b = hre.ethers.constants.MaxUint256;
        const testSumInputs = new dfs.Recipe('TestSumInputs', [
            new dfs.actions.basic.SumInputsAction(a, b),
            new dfs.actions.basic.PullTokenAction(WETH_ADDRESS, senderAcc.address, '$1'),
        ]);
        const functionData = testSumInputs.encodeForDsProxyCall()[1];

        await expect(proxy['execute(address,bytes)'](RecipeExecutorAddr, functionData)).to.be.reverted;
    });
});
