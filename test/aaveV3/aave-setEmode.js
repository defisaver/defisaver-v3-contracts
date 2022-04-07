const { expect } = require('chai');

const hre = require('hardhat');

const {
    getProxy, balanceOf, setBalance, redeploy, takeSnapshot, revertToSnapshot,
    addrs, AAVE_MARKET_OPTIMISM,
} = require('../utils');
const { aaveV3Supply, aaveV3SetEMode, aaveV3SetEModeCalldataOptimised } = require('../actions');

describe('Aave-Set-EMode-L2', function () {
    this.timeout(150000);

    let senderAcc; let proxy; let snapshotId; let pool;
    let WETH_ADDRESS; let aWETH;
    const network = hre.network.config.name;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        await redeploy('AaveV3Supply');
        await redeploy('AaveV3SetEMode');
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

    it('... should change EMode on Aave V3 optimism', async () => {
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

        let userEmode = await pool.getUserEMode(proxy.address);
        console.log(`Users emode before changing: ${userEmode}`);
        expect(userEmode).to.be.eq(0);

        await aaveV3SetEMode(proxy, AAVE_MARKET_OPTIMISM, 1);

        userEmode = await pool.getUserEMode(proxy.address);

        expect(userEmode).to.be.eq(1);
        console.log(`Users emode before changing: ${userEmode}`);
    });
    it('... should supply WETH to Aave V3 optimism with calldata optimised', async () => {
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

        let userEmode = await pool.getUserEMode(proxy.address);
        console.log(`Users emode before changing: ${userEmode}`);
        expect(userEmode).to.be.eq(0);

        await aaveV3SetEModeCalldataOptimised(proxy, AAVE_MARKET_OPTIMISM, 1);

        userEmode = await pool.getUserEMode(proxy.address);
        console.log(`Users emode before changing: ${userEmode}`);
        expect(userEmode).to.be.eq(1);
    });
});
