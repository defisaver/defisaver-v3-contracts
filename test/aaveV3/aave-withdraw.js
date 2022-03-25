const { expect } = require('chai');

const hre = require('hardhat');

const {
    getProxy, balanceOf, setBalance, redeploy, takeSnapshot, revertToSnapshot,
} = require('../utils');
const { aaveV3Supply, aaveV3Withdraw, aaveV3WithdrawCalldataOptimised } = require('../actions');

describe('Aave-Withdraw-L2', function () {
    this.timeout(150000);
    const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
    const aWETH = '0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8';
    const AAVE_MARKET_OPTIMISM = '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb';
    const AAVE_OPTIMISM_POOL = '0x794a61358D6845594F94dc1DB02A252b5b4814aD';

    let senderAcc; let proxy; let pool; let snapshotId;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        await redeploy('AaveV3Supply');
        await redeploy('AaveV3Withdraw');
        pool = await hre.ethers.getContractAt('IL2PoolV3', AAVE_OPTIMISM_POOL);
    });

    beforeEach(async () => {
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
        await revertToSnapshot(snapshotId);
    });

    it('... should supply WETH and then withdraw it on Aave V3 optimism', async () => {
        const amount = hre.ethers.utils.parseUnits('10', 18);
        await setBalance(WETH_ADDRESS, senderAcc.address, amount);

        const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
        console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

        const reserveData = await pool.getReserveData(WETH_ADDRESS);
        const assetId = reserveData.id;
        const from = senderAcc.address;
        const to = senderAcc.address;

        const balanceBefore = await balanceOf(aWETH, proxy.address);
        console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
        await aaveV3Supply(proxy, AAVE_MARKET_OPTIMISM, amount, WETH_ADDRESS, assetId, from);

        const balanceAfter = await balanceOf(aWETH, proxy.address);
        console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);
        // ----------------------------------------------------------------

        const wethBalanceBeforeWithdraw = await balanceOf(WETH_ADDRESS, senderAcc.address);
        console.log(`WETH on EOA before withdraw:${wethBalanceBeforeWithdraw.toString()}`);
        await aaveV3Withdraw(proxy, AAVE_MARKET_OPTIMISM, assetId, amount, to);

        const awethEOAbalanceAfterWithdraw = await balanceOf(aWETH, proxy.address);
        console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

        const wethBalanceAfterWithdraw = await balanceOf(WETH_ADDRESS, senderAcc.address);
        console.log(`WETH on EOA after withdraw:${wethBalanceAfterWithdraw.toString()}`);
        expect(wethBalanceAfterWithdraw).to.be.gt(wethBalanceBeforeWithdraw);
        expect(awethEOAbalanceAfterWithdraw).to.be.lt(balanceAfter);
    });
    it('... should supply WETH and then withdraw it on Aave V3 optimism using optimised calldata', async () => {
        const amount = hre.ethers.utils.parseUnits('10', 18);
        await setBalance(WETH_ADDRESS, senderAcc.address, amount);

        const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
        console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

        const reserveData = await pool.getReserveData(WETH_ADDRESS);
        const assetId = reserveData.id;
        const from = senderAcc.address;
        const to = senderAcc.address;

        const balanceBefore = await balanceOf(aWETH, proxy.address);
        console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
        await aaveV3Supply(proxy, AAVE_MARKET_OPTIMISM, amount, WETH_ADDRESS, assetId, from);

        const balanceAfter = await balanceOf(aWETH, proxy.address);
        console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);
        // ----------------------------------------------------------------

        const wethBalanceBeforeWithdraw = await balanceOf(WETH_ADDRESS, senderAcc.address);
        console.log(`WETH on EOA before withdraw:${wethBalanceBeforeWithdraw.toString()}`);
        await aaveV3WithdrawCalldataOptimised(proxy, AAVE_MARKET_OPTIMISM, assetId, amount, to);

        const awethEOAbalanceAfterWithdraw = await balanceOf(aWETH, proxy.address);

        const wethBalanceAfterWithdraw = await balanceOf(WETH_ADDRESS, senderAcc.address);
        console.log(`WETH on EOA after withdraw:${wethBalanceAfterWithdraw.toString()}`);

        expect(wethBalanceAfterWithdraw).to.be.gt(wethBalanceBeforeWithdraw);
        expect(awethEOAbalanceAfterWithdraw).to.be.lt(balanceAfter);
    });
});
