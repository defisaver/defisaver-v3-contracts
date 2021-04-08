const { expect } = require("chai");

const dfs = require("@defisaver/sdk");

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
} = require("../utils");

const { fetchMakerAddresses, getVaultsForUser, getRatio } = require("../utils-mcd");

const { supplyAave } = require("../actions");

describe("Wrap-Eth", function () {
    this.timeout(80000);

    let makerAddresses, senderAcc, proxy, uniWrapper;

    before(async () => {
        await redeploy("WrapEth");
        await redeploy("DFSSell");
        uniWrapper = await redeploy("UniswapWrapperV3");
        await redeploy("TaskExecutor");

        makerAddresses = await fetchMakerAddresses();
        taskExecutorAddr = await getAddrFromRegistry("TaskExecutor");

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        await setNewExchangeWrapper(senderAcc, uniWrapper.address);
    });
    it(`... should wrap native Eth to Weth direct action`, async () => {
        const wrapEthAddr = await getAddrFromRegistry("WrapEth");

        const amount = ethers.utils.parseUnits("2", 18);

        const wrapEthAction = new dfs.actions.basic.WrapEthAction(amount);
        const functionData = wrapEthAction.encodeForDsProxyCall()[1];

        const wethBalanceBefore = await balanceOf(WETH_ADDRESS, proxy.address);
        console.log(`Weth proxy before: ${wethBalanceBefore / 1e18}`);

        await proxy["execute(address,bytes)"](wrapEthAddr, functionData, {
            value: amount,
            gasLimit: 3000000,
        });

        const wethBalanceAfter = await balanceOf(WETH_ADDRESS, proxy.address);
        console.log(`Weth proxy after: ${wethBalanceAfter / 1e18}`);

        expect(wethBalanceAfter / 1e18).to.be.eq(wethBalanceBefore / 1e18 + amount / 1e18);
    });

    it(`... should do a market sell but first wrap eth -> weth`, async () => {
        const amount = ethers.utils.parseUnits("2", 18);

        const exchangeOrder = formatExchangeObj(
            WETH_ADDRESS,
            makerAddresses["MCD_DAI"],
            amount,
            uniWrapper.address
        );

        const wrapRecipe = new dfs.Recipe("WrapRecipe", [
            new dfs.actions.basic.WrapEthAction(amount),
            new dfs.actions.basic.SellAction(exchangeOrder, proxy.address, senderAcc.address),
        ]);

        const functionData = wrapRecipe.encodeForDsProxyCall();

        const daiBalanceBefore = await balanceOf(makerAddresses["MCD_DAI"], senderAcc.address);
        console.log(`Dai acc before: ${daiBalanceBefore / 1e18}`);

        await proxy["execute(address,bytes)"](taskExecutorAddr, functionData[1], {
            gasLimit: 3000000,
            value: amount,
        });

        const daiBalanceAfter = await balanceOf(makerAddresses["MCD_DAI"], senderAcc.address);
        console.log(`Dai acc after: ${daiBalanceAfter / 1e18}`);

        expect(daiBalanceAfter).to.be.gt(daiBalanceBefore);
    });
});
