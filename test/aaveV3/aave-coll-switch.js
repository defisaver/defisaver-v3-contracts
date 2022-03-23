const { expect } = require('chai');

const hre = require('hardhat');

const {
    getProxy, balanceOf, setBalance, redeploy, takeSnapshot, revertToSnapshot,
} = require('../utils');
const { aaveV3Supply, aaveV3SwitchCollateral, aaveV3SwitchCollateralCallDataOptimised } = require('../actions');

describe('Aave-Supply-L2', function () {
    this.timeout(150000);

    let senderAcc; let proxy; let pool; let snapshotId;
    const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
    const aWETH = '0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8';
    const AAVE_MARKET_OPTIMISM = '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb';
    const AAVE_OPTIMISM_POOL = '0x794a61358D6845594F94dc1DB02A252b5b4814aD';
    const OPTIMISM_DAI = '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1';
    const ADAI = '0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE';

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        await redeploy('AaveV3Supply');
        await redeploy('AaveV3CollateralSwitch');
        pool = await hre.ethers.getContractAt('IL2PoolV3', AAVE_OPTIMISM_POOL);
    });

    beforeEach(async () => {
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
        await revertToSnapshot(snapshotId);
    });

    it('... should supply WETH and DAI to Aave V3 optimism then turn off collateral for them', async () => {
        const amount = hre.ethers.utils.parseUnits('10', 18);
        await setBalance(WETH_ADDRESS, senderAcc.address, amount);

        const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
        console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

        const reserveData = await pool.getReserveData(WETH_ADDRESS);
        const assetId = reserveData.id;
        const from = senderAcc.address;

        const balanceBefore = await balanceOf(aWETH, proxy.address);
        console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
        await aaveV3Supply(proxy, AAVE_MARKET_OPTIMISM, amount, WETH_ADDRESS, assetId, from);

        const balanceAfter = await balanceOf(aWETH, proxy.address);
        console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

        const amountDai = hre.ethers.utils.parseUnits('1000', 18);
        await setBalance(OPTIMISM_DAI, senderAcc.address, amountDai);

        const daiBalanceBefore = await balanceOf(OPTIMISM_DAI, senderAcc.address);
        console.log(`DAI on eoa: ${daiBalanceBefore.toString()}`);

        const reserveDataDAI = await pool.getReserveData(OPTIMISM_DAI);
        const daiAssetId = reserveDataDAI.id;

        const balanceBeforeADAI = await balanceOf(ADAI, proxy.address);
        console.log(`aDAI on proxy before: ${balanceBeforeADAI.toString()}`);
        await aaveV3Supply(proxy, AAVE_MARKET_OPTIMISM, amount, OPTIMISM_DAI, daiAssetId, from);

        const balanceAfterADAI = await balanceOf(ADAI, proxy.address);
        console.log(`aDAI on proxy after: ${balanceAfterADAI.toString()}`);

        //-----------------------------------------------------
        await aaveV3SwitchCollateral(
            proxy, AAVE_MARKET_OPTIMISM, 2, [assetId, daiAssetId], [false, false],
        );
    });
    it('... should supply WETH and DAI to Aave V3 optimism then turn off collateral for them', async () => {
        const amount = hre.ethers.utils.parseUnits('10', 18);
        await setBalance(WETH_ADDRESS, senderAcc.address, amount);

        const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
        console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

        const reserveData = await pool.getReserveData(WETH_ADDRESS);
        const assetId = reserveData.id;
        const from = senderAcc.address;

        const balanceBefore = await balanceOf(aWETH, proxy.address);
        console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);
        await aaveV3Supply(proxy, AAVE_MARKET_OPTIMISM, amount, WETH_ADDRESS, assetId, from);

        const balanceAfter = await balanceOf(aWETH, proxy.address);
        console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);

        const amountDai = hre.ethers.utils.parseUnits('1000', 18);
        await setBalance(OPTIMISM_DAI, senderAcc.address, amountDai);

        const daiBalanceBefore = await balanceOf(OPTIMISM_DAI, senderAcc.address);
        console.log(`DAI on eoa: ${daiBalanceBefore.toString()}`);

        const reserveDataDAI = await pool.getReserveData(OPTIMISM_DAI);
        const daiAssetId = reserveDataDAI.id;

        const balanceBeforeADAI = await balanceOf(ADAI, proxy.address);
        console.log(`aDAI on proxy before: ${balanceBeforeADAI.toString()}`);
        await aaveV3Supply(proxy, AAVE_MARKET_OPTIMISM, amount, OPTIMISM_DAI, daiAssetId, from);

        const balanceAfterADAI = await balanceOf(ADAI, proxy.address);
        console.log(`aDAI on proxy after: ${balanceAfterADAI.toString()}`);

        //-----------------------------------------------------
        await aaveV3SwitchCollateralCallDataOptimised(
            proxy, AAVE_MARKET_OPTIMISM, 2, [assetId, daiAssetId], [false, false],
        );
    });
});
