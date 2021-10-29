const { expect } = require('chai');
const hre = require('hardhat');

const {
    getProxy,
    redeploy,
    balanceOf,
    WETH_ADDRESS,
    approve,
    depositToWeth,
    STETH_ADDRESS,
    WSTETH_ADDRESS,
} = require('../utils');

const { lidoUnwrap, lidoWrap } = require('../actions.js');

describe('Lido WETH staking', function () {
    this.timeout(80000);

    let senderAcc; let
        proxy;

    before(async () => {
        await redeploy('LidoStake');
        await redeploy('LidoWrap');
        await redeploy('LidoUnwrap');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('... directly transform 10 WETH to WstEth and then unwrap into StEth', async () => {
        const amount = hre.ethers.utils.parseUnits('10', 18);
        await depositToWeth(amount);
        await approve(WETH_ADDRESS, proxy.address);

        const wStEthBalanceBefore = await balanceOf(WSTETH_ADDRESS, senderAcc.address);
        const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
        await lidoWrap(amount, senderAcc.address, senderAcc.address, true, proxy);

        const wStEthBalanceAfter = await balanceOf(WSTETH_ADDRESS, senderAcc.address);
        const wethBalanceAfter = await balanceOf(WETH_ADDRESS, senderAcc.address);

        expect(wethBalanceAfter).to.be.eq(wethBalanceBefore.sub(amount));
        const wethChange = wethBalanceBefore.sub(wethBalanceAfter);
        console.log(`Deposited ${wethChange.toString()} WETH`);

        const wStEthChange = wStEthBalanceAfter.sub(wStEthBalanceBefore);
        console.log(`Received ${wStEthChange.toString()} WStEth`);

        await approve(WSTETH_ADDRESS, proxy.address);
        const stEthBalanceBefore = await balanceOf(STETH_ADDRESS, senderAcc.address);
        await lidoUnwrap(amount, senderAcc.address, senderAcc.address, proxy);
        const stEthBalanceAfter = await balanceOf(STETH_ADDRESS, senderAcc.address);
        const stEthChange = stEthBalanceAfter.sub(stEthBalanceBefore);
        console.log(`After unwrapping received ${stEthChange.toString()} StEth`);
    }).timeout(50000);
});
