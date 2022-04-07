const { expect } = require('chai');

const hre = require('hardhat');

const {
    getProxy, balanceOf, setBalance, approve, redeploy, takeSnapshot, revertToSnapshot,
    addrs, AAVE_MARKET_OPTIMISM,
} = require('../utils');
const {
    aaveV3Supply, aaveV3Borrow, aaveV3Payback, aaveV3PaybackCalldataOptimised,
} = require('../actions');

describe('AaveV3-Payback-L2', function () {
    this.timeout(150000);

    let senderAcc; let proxy; let pool; let snapshotId;

    let WETH_ADDRESS; let aWETH; let DAI_ADDRESS;
    const network = hre.network.config.name;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        await redeploy('AaveV3Supply');
        await redeploy('AaveV3Borrow');
        await redeploy('AaveV3Payback');
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

    it('... should supply WETH and borrow DAI then repay the debt to Aave V3 on optimism', async () => {
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
        await approve(DAI_ADDRESS, proxy.address);

        const daiVariableTokenDebt = reserveDataDAI.variableDebtTokenAddress;
        const debtAmountBefore = await balanceOf(daiVariableTokenDebt, proxy.address);
        console.log(`Debt before payback ${debtAmountBefore.toString()}`);

        await aaveV3Payback(
            proxy, AAVE_MARKET_OPTIMISM, amountDai, from, 2, reserveDataDAI.id, DAI_ADDRESS,
        );

        const daiBalanceAfterPayback = await balanceOf(DAI_ADDRESS, senderAcc.address);
        console.log(`DAI on EOA after payback:${daiBalanceAfterPayback.toString()}`);

        const debtAmountAfter = await balanceOf(daiVariableTokenDebt, proxy.address);
        console.log(`Debt after payback ${debtAmountAfter.toString()}`);
        expect(debtAmountAfter).to.be.lt(debtAmountBefore);
    });
    it('... should supply WETH and borrow DAI then repay the debt to Aave V3 on optimism using optimised calldata', async () => {
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
        await approve(DAI_ADDRESS, proxy.address);

        const daiVariableTokenDebt = reserveDataDAI.variableDebtTokenAddress;
        const debtAmountBefore = await balanceOf(daiVariableTokenDebt, proxy.address);
        console.log(`Debt before payback ${debtAmountBefore.toString()}`);

        await aaveV3PaybackCalldataOptimised(
            proxy, AAVE_MARKET_OPTIMISM, amountDai, from, 2, reserveDataDAI.id, DAI_ADDRESS,
        );

        const daiBalanceAfterPayback = await balanceOf(DAI_ADDRESS, senderAcc.address);
        console.log(`DAI on EOA after payback:${daiBalanceAfterPayback.toString()}`);

        const debtAmountAfter = await balanceOf(daiVariableTokenDebt, proxy.address);
        console.log(`Debt after payback ${debtAmountAfter.toString()}`);

        expect(debtAmountAfter).to.be.lt(debtAmountBefore);
    });
    it('... should supply WETH and borrow DAI then repay uint(-1) ALL debt to Aave V3 on optimism using optimised calldata', async () => {
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
        await setBalance(DAI_ADDRESS, senderAcc.address, amountDai.mul(2));
        await approve(DAI_ADDRESS, proxy.address);

        const daiVariableTokenDebt = reserveDataDAI.variableDebtTokenAddress;
        const debtAmountBefore = await balanceOf(daiVariableTokenDebt, proxy.address);
        console.log(`Debt before payback ${debtAmountBefore.toString()}`);

        await aaveV3PaybackCalldataOptimised(
            proxy,
            AAVE_MARKET_OPTIMISM,
            hre.ethers.constants.MaxUint256,
            from,
            2,
            reserveDataDAI.id,
            DAI_ADDRESS,
        );

        const daiBalanceAfterPayback = await balanceOf(DAI_ADDRESS, senderAcc.address);
        console.log(`DAI on EOA after payback:${daiBalanceAfterPayback.toString()}`);

        const debtAmountAfter = await balanceOf(daiVariableTokenDebt, proxy.address);
        console.log(`Debt after payback ${debtAmountAfter.toString()}`);

        expect(debtAmountAfter).to.be.lt(debtAmountBefore);
        expect(debtAmountAfter).to.be.eq(0);
    });
});
