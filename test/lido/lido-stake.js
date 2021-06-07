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
} = require('../utils');

const { lidoStake } = require('../actions.js');

describe('Lido WETH staking', function () {
    this.timeout(80000);

    let senderAcc; let
        proxy;

    before(async () => {
        await redeploy('LidoStake');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('... stake 10 WETH to LIDO', async () => {
        const amount = hre.ethers.utils.parseUnits('10', 18);
        await depositToWeth(amount);
        await approve(WETH_ADDRESS, proxy.address);

        const stEthBalanceBefore = await balanceOf(STETH_ADDRESS, senderAcc.address);
        const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
        await lidoStake(amount, senderAcc.address, senderAcc.address, proxy);
        const stEthBalanceAfter = await balanceOf(STETH_ADDRESS, senderAcc.address);
        const wethBalanceAfter = await balanceOf(WETH_ADDRESS, senderAcc.address);

        expect(wethBalanceAfter).to.be.eq(wethBalanceBefore.sub(amount));

        const wethChange = wethBalanceBefore.sub(wethBalanceAfter);
        const stEthChange = stEthBalanceAfter.sub(stEthBalanceBefore);
        const difference = wethChange.sub(stEthChange);
        expect(difference.toNumber()).to.be.within(0, 2);
    }).timeout(50000);
});
