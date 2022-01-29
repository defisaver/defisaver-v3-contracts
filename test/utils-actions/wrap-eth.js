const { expect } = require('chai');
const hre = require('hardhat');

const dfs = require('@defisaver/sdk');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    balanceOf,
    formatExchangeObj,
    getWeth,
    setNewExchangeWrapper,
} = require('../utils');

const { fetchMakerAddresses } = require('../utils-mcd');

// TODO: test when amount == uint.max

describe('Wrap-Eth', function () {
    this.timeout(80000);

    let makerAddresses; let senderAcc; let proxy; let
        uniWrapper;
    let RecipeExecutorAddr;

    before(async () => {
        await redeploy('WrapEth');
        await redeploy('DFSSell');
        uniWrapper = await redeploy('UniswapWrapperV3');
        await redeploy('RecipeExecutor');

        makerAddresses = await fetchMakerAddresses();
        RecipeExecutorAddr = await getAddrFromRegistry('RecipeExecutor');

        // eslint-disable-next-line prefer-destructuring
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        await setNewExchangeWrapper(senderAcc, uniWrapper.address);
    });
    it('... should wrap native Eth to Weth direct action', async () => {
        const wrapEthAddr = await getAddrFromRegistry('WrapEth');

        const amount = hre.ethers.utils.parseUnits('2', 18);

        const wrapEthAction = new dfs.actions.basic.WrapEthAction(amount);
        const functionData = wrapEthAction.encodeForDsProxyCall()[1];

        const wethBalanceBefore = await balanceOf(getWeth(), proxy.address);
        console.log(`Weth proxy before: ${wethBalanceBefore / 1e18}`);

        await proxy['execute(address,bytes)'](wrapEthAddr, functionData, {
            value: amount,
            gasLimit: 3000000,
        });

        const wethBalanceAfter = await balanceOf(getWeth(), proxy.address);
        console.log(`Weth proxy after: ${wethBalanceAfter / 1e18}`);

        expect(wethBalanceAfter / 1e18).to.be.eq(wethBalanceBefore / 1e18 + amount / 1e18);
    });

    it('... should do a market sell but first wrap eth -> weth', async () => {
        const amount = hre.ethers.utils.parseUnits('2', 18);

        const exchangeOrder = formatExchangeObj(
            getWeth(),
            makerAddresses.MCD_DAI,
            amount,
            uniWrapper.address,
        );

        const wrapRecipe = new dfs.Recipe('WrapRecipe', [
            new dfs.actions.basic.WrapEthAction(amount),
            new dfs.actions.basic.SellAction(exchangeOrder, proxy.address, senderAcc.address),
        ]);

        const functionData = wrapRecipe.encodeForDsProxyCall();

        const daiBalanceBefore = await balanceOf(makerAddresses.MCD_DAI, senderAcc.address);
        console.log(`Dai acc before: ${daiBalanceBefore / 1e18}`);

        await proxy['execute(address,bytes)'](RecipeExecutorAddr, functionData[1], {
            gasLimit: 3000000,
            value: amount,
        });

        const daiBalanceAfter = await balanceOf(makerAddresses.MCD_DAI, senderAcc.address);
        console.log(`Dai acc after: ${daiBalanceAfter / 1e18}`);

        expect(daiBalanceAfter).to.be.gt(daiBalanceBefore);
    });
});
