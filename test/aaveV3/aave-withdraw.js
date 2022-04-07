const { expect } = require('chai');

const hre = require('hardhat');

const {
    getProxy, balanceOf, setBalance, redeploy, takeSnapshot, revertToSnapshot,
    addrs, AAVE_MARKET_OPTIMISM,
} = require('../utils');
const { aaveV3Supply, aaveV3Withdraw, aaveV3WithdrawCalldataOptimised } = require('../actions');

describe('Aave-Withdraw-L2', function () {
    this.timeout(150000);

    let senderAcc; let proxy; let pool; let snapshotId;
    let WETH_ADDRESS; let aWETH;
    const network = hre.network.config.name;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        await redeploy('AaveV3Supply');
        await redeploy('AaveV3Withdraw');
        const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', AAVE_MARKET_OPTIMISM);
        const poolAddres = await aaveMarketContract.getPool();

        pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddres);
        WETH_ADDRESS = addrs[network].WETH_ADDRESS;

        aWETH = (await pool.getReserveData(WETH_ADDRESS)).aTokenAddress;
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
