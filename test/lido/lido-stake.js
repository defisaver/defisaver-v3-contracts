const { expect } = require('chai');
const hre = require('hardhat');

const {
    getProxy,
    redeploy,
    balanceOf,
    WETH_ADDRESS,
    approve,
    depositToWeth,
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

        const stEthBalanceBefore = await balanceOf('0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', senderAcc.address);
        const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
        await lidoStake(amount, senderAcc.address, senderAcc.address, proxy);
        const stEthBalanceAfter = await balanceOf('0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', senderAcc.address);
        const wethBalanceAfter = await balanceOf(WETH_ADDRESS, senderAcc.address);

        expect(wethBalanceAfter).to.be.eq(wethBalanceBefore.sub(amount));

        const wethChange = wethBalanceBefore.sub(wethBalanceAfter);
        const stEthChange = stEthBalanceAfter.sub(stEthBalanceBefore);
        // first time this is called the difference is 2 because of stEth internal math
        if (wethChange.sub(stEthChange).eq(2)) {
            expect((stEthBalanceAfter.sub(stEthBalanceBefore)))
                .to.be.eq(wethBalanceBefore.sub(wethBalanceAfter).sub(2));
        } else {
            expect((stEthBalanceAfter.sub(stEthBalanceBefore)))
                .to.be.eq(wethBalanceBefore.sub(wethBalanceAfter));
        }
    }).timeout(50000);
});
