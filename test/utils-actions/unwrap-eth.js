const { expect } = require("chai");

const dfs = require('@defisaver/sdk')

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    send,
    balanceOf,
    isEth,
    formatExchangeObj,
    standardAmounts,
    nullAddress,
    REGISTRY_ADDR,
    ETH_ADDR,
    AAVE_MARKET,
    WETH_ADDRESS,
    setNewExchangeWrapper,
    depositToWeth
} = require('../utils');

const {
    fetchMakerAddresses,
    getVaultsForUser,
    getRatio,
} = require('../utils-mcd');

const {
    supplyAave,
} = require('../actions');

describe("Unwrap-Eth", function () {
    this.timeout(80000);

    let makerAddresses, senderAcc, proxy, uniWrapper;

    before(async () => {
        await redeploy('UnwrapEth');
        await redeploy('DFSSell');
        uniWrapper = await redeploy('UniswapWrapperV3');
        await redeploy('TaskExecutor');

        makerAddresses = await fetchMakerAddresses();
        taskExecutorAddr = await getAddrFromRegistry('TaskExecutor');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        await setNewExchangeWrapper(senderAcc, uniWrapper.address);

    });
        it(`... should unwrap native WEth to Eth direct action`, async () => {
            const unwrapEthAddr = await getAddrFromRegistry('UnwrapEth');

            const amount = ethers.utils.parseUnits('2', 18);
            await depositToWeth(amount);

            await send(WETH_ADDRESS, senderAcc.address, amount);

            const unwrapEthAction = new dfs.actions.basic.UnwrapEthAction(amount, senderAcc.address);
            const functionData = unwrapEthAction.encodeForDsProxyCall()[1];

            const ethBalanceBefore = await balanceOf(ETH_ADDR, senderAcc.address);
            console.log(`Eth proxy before: ${ethBalanceBefore / 1e18}`);
        
            await proxy['execute(address,bytes)'](unwrapEthAddr, functionData, {gasLimit: 3000000});

            const ethBalanceAfter = await balanceOf(ETH_ADDR, senderAcc.address);
            console.log(`Eth proxy after: ${ethBalanceAfter / 1e18}`);

            expect(ethBalanceAfter/1e18).to.be.gt(ethBalanceBefore/1e18);
        });

        it(`... should unwrap weth -> eth in a recipe`, async () => {

            const amount = ethers.utils.parseUnits('2', 18);

            await send(ETH_ADDR, proxy.address, amount);

            const unwrapRecipe = new dfs.Recipe("UnwrapRecipe", [
                new dfs.actions.basic.WrapEthAction(amount),
                new dfs.actions.basic.UnwrapEthAction(amount, senderAcc.address),
            ]);

            const functionData = unwrapRecipe.encodeForDsProxyCall();

            const ethBalanceBefore = await balanceOf(ETH_ADDR, senderAcc.address);
            console.log(`Eth proxy before: ${ethBalanceBefore / 1e18}`);

            await proxy['execute(address,bytes)'](taskExecutorAddr, functionData[1], { gasLimit: 3000000});

            const ethBalanceAfter = await balanceOf(ETH_ADDR, senderAcc.address);
            console.log(`Eth proxy after: ${ethBalanceAfter / 1e18}`);

            expect(ethBalanceAfter/1e18).to.be.gt(ethBalanceBefore/1e18);
        });

});

