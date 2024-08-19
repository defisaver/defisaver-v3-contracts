const { expect } = require('chai');
const hre = require('hardhat');

const {
    getProxy,
    redeploy,
    balanceOf,
    WETH_ADDRESS,
    approve,
    depositToWeth,
    RETH_ADDRESS,
    ROCKET_DEPOSIT_POOL,
    resetForkToBlock,
} = require('../utils');

const { rocketPoolStake } = require('../actions');

describe('Rocket Pool WETH staking', function () {
    this.timeout(80000);

    const blockThatAcceptsRocketPoolDeposits = 20030817;

    let senderAcc;
    let wallet;
    let rocketPool;

    before(async () => {
        await resetForkToBlock(blockThatAcceptsRocketPoolDeposits);

        senderAcc = (await hre.ethers.getSigners())[0];
        wallet = await getProxy(senderAcc.address, hre.config.isWalletSafe);

        rocketPool = await hre.ethers.getContractAt('IRocketDepositPool', ROCKET_DEPOSIT_POOL);

        await redeploy('RocketPoolStake');
    });

    it('... stake WETH to Rocket Pool', async () => {
        const maxDepositAmount = await rocketPool.getMaximumDepositAmount();
        if (maxDepositAmount.eq(0)) {
            console.log('Rocket Pool is full at the moment, cannot deposit, skipping test...');
            return;
        }

        const amount = maxDepositAmount.sub(1);
        await depositToWeth(amount);
        await approve(WETH_ADDRESS, wallet.address);

        const rEthBalanceBefore = await balanceOf(RETH_ADDRESS, senderAcc.address);
        const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);

        await rocketPoolStake(amount, senderAcc.address, senderAcc.address, wallet);

        const rEthBalanceAfter = await balanceOf(RETH_ADDRESS, senderAcc.address);
        const wethBalanceAfter = await balanceOf(WETH_ADDRESS, senderAcc.address);

        const wethChange = wethBalanceBefore.sub(wethBalanceAfter);
        const rEthChange = rEthBalanceAfter.sub(rEthBalanceBefore);

        expect(wethChange).to.be.eq(amount);
        expect(rEthChange).to.be.gt(0);

        console.log('WETH amount:', amount);
        console.log('rETH amount:', rEthChange);
    });
});
