const { expect } = require('chai');

const hre = require('hardhat');

const {
    getProxy, balanceOf, setBalance, redeploy, takeSnapshot, revertToSnapshot,
    addrs, AAVE_MARKET_OPTIMISM,
} = require('../utils');
const { aaveV3Supply, aaveV3Borrow, aaveV3BorrowCalldataOptimised } = require('../actions');

describe('Aave-Borrow-L2', function () {
    this.timeout(150000);

    let senderAcc; let proxy; let pool; let snapshotId;

    let WETH_ADDRESS; let aWETH; let DAI_ADDRESS;
    const network = hre.network.config.name;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        await redeploy('AaveV3Supply');
        await redeploy('AaveV3Borrow');
        const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', AAVE_MARKET_OPTIMISM);
        const poolAddres = await aaveMarketContract.getPool();

        pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddres);
        WETH_ADDRESS = addrs[network].WETH_ADDRESS;
        DAI_ADDRESS = addrs[network].DAI_ADDRESS;

        aWETH = (await pool.getReserveData(WETH_ADDRESS)).aTokenAddress;
    });
    beforeEach(async () => {
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
        await revertToSnapshot(snapshotId);
    });

    it('... should supply WETH and borrow DAI on Aave V3 Optimism', async () => {
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

        const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
        const amountDai = hre.ethers.utils.parseUnits('1000', 18);

        const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
        console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
        await aaveV3Borrow(proxy, AAVE_MARKET_OPTIMISM, amountDai, to, 2, reserveDataDAI.id);

        const daiBalanceAfter = await balanceOf(DAI_ADDRESS, senderAcc.address);
        console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);
        expect(daiBalanceAfter).to.be.gt(daiBalanceBefore);
    });
    it('... should supply WETH and borrow DAI on Aave V3 Optimism using optimised calldata', async () => {
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

        const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
        const amountDai = hre.ethers.utils.parseUnits('1000', 18);

        const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
        console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
        await aaveV3BorrowCalldataOptimised(
            proxy, AAVE_MARKET_OPTIMISM, amountDai, to, 2, reserveDataDAI.id,
        );

        const daiBalanceAfter = await balanceOf(DAI_ADDRESS, senderAcc.address);
        console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);
        expect(daiBalanceAfter).to.be.gt(daiBalanceBefore);
    });
});
