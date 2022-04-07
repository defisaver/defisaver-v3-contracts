const { expect } = require('chai');

const hre = require('hardhat');

const {
    getProxy, balanceOf, setBalance, redeploy, takeSnapshot, revertToSnapshot,
    addrs, AAVE_MARKET_OPTIMISM,
} = require('../utils');
const { aaveV3Supply, aaveV3SwitchCollateral, aaveV3SwitchCollateralCallDataOptimised } = require('../actions');

describe('Aave-Coll-Switch-L2', function () {
    this.timeout(150000);

    let senderAcc; let proxy; let pool; let snapshotId;

    let WETH_ADDRESS; let aWETH; let DAI_ADDRESS; let aDAI;
    const network = hre.network.config.name;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        await redeploy('AaveV3Supply');
        await redeploy('AaveV3CollateralSwitch');
        const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', AAVE_MARKET_OPTIMISM);
        const poolAddres = await aaveMarketContract.getPool();

        pool = await hre.ethers.getContractAt('IL2PoolV3', poolAddres);
        WETH_ADDRESS = addrs[network].WETH_ADDRESS;
        DAI_ADDRESS = addrs[network].DAI_ADDRESS;

        aWETH = (await pool.getReserveData(WETH_ADDRESS)).aTokenAddress;
        aDAI = (await pool.getReserveData(DAI_ADDRESS)).aTokenAddress;
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
        await setBalance(DAI_ADDRESS, senderAcc.address, amountDai);

        const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
        console.log(`DAI on eoa: ${daiBalanceBefore.toString()}`);

        const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
        const daiAssetId = reserveDataDAI.id;

        const balanceBeforeADAI = await balanceOf(aDAI, proxy.address);
        console.log(`aDAI on proxy before: ${balanceBeforeADAI.toString()}`);
        await aaveV3Supply(proxy, AAVE_MARKET_OPTIMISM, amount, DAI_ADDRESS, daiAssetId, from);

        const balanceAfterADAI = await balanceOf(aDAI, proxy.address);
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
        await setBalance(DAI_ADDRESS, senderAcc.address, amountDai);

        const daiBalanceBefore = await balanceOf(DAI_ADDRESS, senderAcc.address);
        console.log(`DAI on eoa: ${daiBalanceBefore.toString()}`);

        const reserveDataDAI = await pool.getReserveData(DAI_ADDRESS);
        const daiAssetId = reserveDataDAI.id;

        const balanceBeforeADAI = await balanceOf(aDAI, proxy.address);
        console.log(`aDAI on proxy before: ${balanceBeforeADAI.toString()}`);
        await aaveV3Supply(proxy, AAVE_MARKET_OPTIMISM, amount, DAI_ADDRESS, daiAssetId, from);

        const balanceAfterADAI = await balanceOf(aDAI, proxy.address);
        console.log(`aDAI on proxy after: ${balanceAfterADAI.toString()}`);

        //-----------------------------------------------------
        await aaveV3SwitchCollateralCallDataOptimised(
            proxy, AAVE_MARKET_OPTIMISM, 2, [assetId, daiAssetId], [false, false],
        );
    });
});
