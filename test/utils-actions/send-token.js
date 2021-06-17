const { expect } = require('chai');
const hre = require('hardhat');
const dfs = require('@defisaver/sdk');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    balanceOf,
    WETH_ADDRESS,
} = require('../utils');

describe('Send-Token', function () {
    this.timeout(80000);

    let senderAcc; let proxy;

    before(async () => {
        await redeploy('WrapEth');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });
    it('... should send tokens direct action', async () => {
        const wrapEthAddr = await getAddrFromRegistry('WrapEth');
        const wrapEthAction = new dfs.actions.basic.WrapEthAction(hre.ethers.utils.parseUnits('4', 18));
        const functionData = wrapEthAction.encodeForDsProxyCall()[1];
        await proxy['execute(address,bytes)'](wrapEthAddr, functionData, {
            value: hre.ethers.utils.parseUnits('4', 18),
            gasLimit: 3000000,
        });

        const sendTokenAddr = await getAddrFromRegistry('SendToken');
        const sendTokenAction = new dfs.actions.basic.SendTokenAction(
            WETH_ADDRESS, senderAcc.address, hre.ethers.utils.parseUnits('3', 18),
        );
        const sendTokenData = sendTokenAction.encodeForDsProxyCall()[1];
        const balanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
        await proxy['execute(address,bytes)'](sendTokenAddr, sendTokenData);
        const balanceAfter = await balanceOf(WETH_ADDRESS, senderAcc.address);
        const balanceDiff = balanceAfter.sub(balanceBefore);
        expect(balanceDiff).to.be.eq(hre.ethers.utils.parseUnits('3', 18));
    });

    it('... should send tokens direct action uint256.max', async () => {
        const sendTokenAddr = await getAddrFromRegistry('SendToken');
        const sendTokenAction = new dfs.actions.basic.SendTokenAction(
            WETH_ADDRESS, senderAcc.address, hre.ethers.constants.MaxUint256,
        );
        const sendTokenData = sendTokenAction.encodeForDsProxyCall()[1];
        const proxyBalanceAtStart = await balanceOf(WETH_ADDRESS, proxy.address);
        const balanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);

        await proxy['execute(address,bytes)'](sendTokenAddr, sendTokenData);
        const balanceAfter = await balanceOf(WETH_ADDRESS, senderAcc.address);
        const balanceDiff = balanceAfter.sub(balanceBefore);

        expect(balanceDiff).to.be.eq(proxyBalanceAtStart);
    });
});
