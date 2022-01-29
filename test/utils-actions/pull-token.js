const { expect } = require('chai');
const hre = require('hardhat');
const dfs = require('@defisaver/sdk');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    balanceOf,
    approve,
    depositToWeth,
    getWeth,
} = require('../utils');

describe('Pull-Token', function () {
    this.timeout(80000);

    let senderAcc; let proxy;

    before(async () => {
        await redeploy('PullToken');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('... should pull tokens direct action', async () => {
        await depositToWeth(hre.ethers.utils.parseUnits('10', 18));
        await approve(getWeth(), proxy.address);

        const proxyBalanceBefore = await balanceOf(getWeth(), proxy.address);
        const pullTokenAddr = await getAddrFromRegistry('PullToken');
        const pullTokenAction = new dfs.actions.basic.PullTokenAction(
            getWeth(), senderAcc.address, hre.ethers.utils.parseUnits('3', 18),
        );
        const pullTokenData = pullTokenAction.encodeForDsProxyCall()[1];

        await proxy['execute(address,bytes)'](pullTokenAddr, pullTokenData);

        const proxyBalanceAfter = await balanceOf(getWeth(), proxy.address);
        const proxyBalanceDifference = proxyBalanceAfter.sub(proxyBalanceBefore);

        expect(proxyBalanceDifference).to.be.eq(hre.ethers.utils.parseUnits('3', 18));
    });

    it('... should pull tokens uint256.max direct action', async () => {
        const proxyBalanceBefore = await balanceOf(getWeth(), proxy.address);
        const senderAccBalanceBefore = await balanceOf(getWeth(), senderAcc.address);
        const pullTokenAddr = await getAddrFromRegistry('PullToken');
        const pullTokenAction = new dfs.actions.basic.PullTokenAction(
            getWeth(), senderAcc.address, hre.ethers.constants.MaxUint256,
        );
        const pullTokenData = pullTokenAction.encodeForDsProxyCall()[1];

        await proxy['execute(address,bytes)'](pullTokenAddr, pullTokenData);

        const proxyBalanceAfter = await balanceOf(getWeth(), proxy.address);
        const proxyBalanceDifference = proxyBalanceAfter.sub(proxyBalanceBefore);

        expect(proxyBalanceDifference).to.be.eq(senderAccBalanceBefore);
    });
});
