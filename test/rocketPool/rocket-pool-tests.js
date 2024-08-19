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
    takeSnapshot,
    revertToSnapshot,
    ETH_ADDR,
    MAX_UINT,
} = require('../utils');

const { rocketPoolStake, rocketPoolUnstake } = require('../actions');

describe('Rocket Pool Tests', function () {
    this.timeout(80000);

    const blockThatAcceptsRocketPoolDeposits = 20030817;

    let senderAcc;
    let wallet;
    let maxDepositAmount;
    let snapshotId;

    before(async () => {
        await resetForkToBlock(blockThatAcceptsRocketPoolDeposits);

        senderAcc = (await hre.ethers.getSigners())[0];
        wallet = await getProxy(senderAcc.address, hre.config.isWalletSafe);

        const rocketPool = await hre.ethers.getContractAt('IRocketDepositPool', ROCKET_DEPOSIT_POOL);

        maxDepositAmount = await rocketPool.getMaximumDepositAmount();
        if (maxDepositAmount.eq(0)) {
            console.log('Rocket Pool is full at the moment, cannot deposit, skipping test...');
            this.skip();
        }

        await redeploy('RocketPoolStake');
        await redeploy('RocketPoolUnstake');
    });

    beforeEach(async () => { snapshotId = await takeSnapshot(); });
    afterEach(async () => { await revertToSnapshot(snapshotId); });

    const stakeAtRocketPool = async (amount, signer, to) => {
        await depositToWeth(amount, signer);

        const wethBalanceBefore = await balanceOf(WETH_ADDRESS, signer.address);
        const rEthBalanceBefore = await balanceOf(RETH_ADDRESS, to);

        await approve(WETH_ADDRESS, wallet.address, signer);
        await rocketPoolStake(amount, signer.address, to, wallet);

        const wethBalanceAfter = await balanceOf(WETH_ADDRESS, senderAcc.address);
        const rEthBalanceAfter = await balanceOf(RETH_ADDRESS, to);

        return {
            wethChange: wethBalanceBefore.sub(wethBalanceAfter),
            rEthReceived: rEthBalanceAfter.sub(rEthBalanceBefore),
        };
    };

    it('... should stake WETH to Rocket Pool', async () => {
        const amount = maxDepositAmount.sub(1);
        const to = senderAcc.address;

        const { wethChange, rEthReceived } = await stakeAtRocketPool(amount, senderAcc, to);

        expect(wethChange).to.be.eq(amount);
        expect(rEthReceived).to.be.gt(0);

        console.log('WETH amount:', amount);
        console.log('rETH amount:', rEthReceived);
    });

    it('... should stake WETH to Rocket Pool and withdraw part of it', async () => {
        const amount = maxDepositAmount.sub(1);
        const rEthReceiver = wallet.address;
        const ethReceiver = senderAcc.address;

        const { rEthReceived } = await stakeAtRocketPool(amount, senderAcc, rEthReceiver);

        const ethToWithdraw = rEthReceived.div(2);

        const rEthReceiverBalanceBefore = await balanceOf(RETH_ADDRESS, rEthReceiver);
        const ethReceiverBalanceBefore = await balanceOf(ETH_ADDR, ethReceiver);

        await rocketPoolUnstake(ethToWithdraw, ethReceiver, wallet);

        const rEthReceiverBalanceAfter = await balanceOf(RETH_ADDRESS, rEthReceiver);
        const ethReceiverBalanceAfter = await balanceOf(ETH_ADDR, ethReceiver);

        expect(rEthReceiverBalanceBefore.sub(rEthReceiverBalanceAfter)).to.be.eq(ethToWithdraw);
        expect(ethReceiverBalanceAfter.sub(ethReceiverBalanceBefore)).to.be.gt(0);
    });

    it('... should stake WETH to Rocket Pool and withdraw whole balance', async () => {
        const amount = maxDepositAmount.sub(1);
        const rEthReceiver = wallet.address;
        const ethReceiver = senderAcc.address;

        await stakeAtRocketPool(amount, senderAcc, rEthReceiver);

        const ethReceiverBalanceBefore = await balanceOf(ETH_ADDR, ethReceiver);

        await rocketPoolUnstake(MAX_UINT, ethReceiver, wallet);

        const rEthReceiverBalanceAfter = await balanceOf(RETH_ADDRESS, rEthReceiver);
        const ethReceiverBalanceAfter = await balanceOf(ETH_ADDR, ethReceiver);

        expect(rEthReceiverBalanceAfter).to.be.eq(0);
        expect(ethReceiverBalanceAfter.sub(ethReceiverBalanceBefore)).to.be.gt(0);
    });
});
