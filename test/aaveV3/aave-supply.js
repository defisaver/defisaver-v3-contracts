const { expect } = require('chai');

const hre = require('hardhat');

const {
    getProxy,
    balanceOf, setBalance, redeploy, takeSnapshot, revertToSnapshot, AAVE_MARKET_OPTIMISM, addrs,
} = require('../utils');
const { aaveV3Supply, aaveV3SupplyCalldataOptimised } = require('../actions');

describe('Aave-Supply-L2', function () {
    this.timeout(150000);

    let senderAcc; let proxy; let pool; let snapshotId;
    let WETH_ADDRESS; let aWETH;
    const network = hre.network.config.name;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        await redeploy('AaveV3Supply');
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

    it('... should supply WETH to Aave V3 optimism', async () => {
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
        expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it('... should supply WETH to Aave V3 optimism using optimised calldata', async () => {
        const amount = hre.ethers.utils.parseUnits('10', 18);
        await setBalance(WETH_ADDRESS, senderAcc.address, amount);

        const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
        console.log(`WETH on eoa: ${wethBalanceBefore.toString()}`);

        const reserveData = await pool.getReserveData(WETH_ADDRESS);
        const assetId = reserveData.id;
        const from = senderAcc.address;

        const balanceBefore = await balanceOf(aWETH, proxy.address);
        console.log(`aWETH on proxy before: ${balanceBefore.toString()}`);

        await aaveV3SupplyCalldataOptimised(
            proxy, AAVE_MARKET_OPTIMISM, amount, WETH_ADDRESS, assetId, from,
        );

        const balanceAfter = await balanceOf(aWETH, proxy.address);
        console.log(`aWETH on proxy after: ${balanceAfter.toString()}`);
        expect(balanceAfter).to.be.gt(balanceBefore);
    });
});
