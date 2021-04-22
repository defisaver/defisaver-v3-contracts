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

// TODO: test when amount == uint.max

describe('Send-Token', function () {
    this.timeout(80000);

    let senderAcc; let recieverAcc; let proxy;

    before(async () => {
        await redeploy('WrapEth');
        await redeploy('DFSSell');
        await redeploy('TaskExecutor');

        // eslint-disable-next-line prefer-destructuring
        senderAcc = (await hre.ethers.getSigners())[0];
        recieverAcc = (await hre.ethers.getSigners())[1];
        proxy = await getProxy(senderAcc.address);
    });
    it('... should send tokens direct action', async () => {
        const wrapEthAddr = await getAddrFromRegistry('WrapEth');

        const amount = hre.ethers.constants.WeiPerEther;

        const wrapEthAction = new dfs.actions.basic.WrapEthAction(amount.mul(4));

        const functionData = wrapEthAction.encodeForDsProxyCall()[1];

        await proxy['execute(address,bytes)'](wrapEthAddr, functionData, {
            value: amount.mul(4),
            gasLimit: 3000000,
        });

        const sendTokenAddr = await getAddrFromRegistry('SendToken');

        const sendTokenAction = new dfs.actions.basic.SendTokenAction(
            WETH_ADDRESS, recieverAcc.address, amount.mul(3),
        );

        const sendTokenData = sendTokenAction.encodeForDsProxyCall()[1];

        await proxy['execute(address,bytes)'](sendTokenAddr, sendTokenData);

        expect(await balanceOf(WETH_ADDRESS, recieverAcc.address)).to.be.eq(amount.mul(3));
    });

    it('... should send tokens direct action uint256.max', async () => {
        const amount = hre.ethers.constants.WeiPerEther;
        const sendTokenAddr = await getAddrFromRegistry('SendToken');

        const sendTokenAction = new dfs.actions.basic.SendTokenAction(
            WETH_ADDRESS, recieverAcc.address, hre.ethers.constants.MaxUint256,
        );

        const sendTokenData = sendTokenAction.encodeForDsProxyCall()[1];

        await proxy['execute(address,bytes)'](sendTokenAddr, sendTokenData);

        expect(await balanceOf(WETH_ADDRESS, recieverAcc.address)).to.be.eq(amount.mul(4));
    });
});
