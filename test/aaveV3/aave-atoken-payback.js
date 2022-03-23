const { expect } = require('chai');

const hre = require('hardhat');
const {
    aaveV3Supply, aaveV3Borrow, aaveV3ATokenPayback, aaveV3ATokenPaybackCalldataOptimised,
} = require('../actions');

const {
    getProxy, balanceOf, setBalance, approve, redeploy, takeSnapshot, revertToSnapshot,
} = require('../utils');

describe('AaveV3-Payback-L2', function () {
    this.timeout(150000);

    let senderAcc; let proxy; let pool; let snapshotId;
    const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
    const aWETH = '0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8';
    const AAVE_MARKET_OPTIMISM = '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb';
    const OPTIMISM_DAI = '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1';
    const AAVE_OPTIMISM_POOL = '0x794a61358D6845594F94dc1DB02A252b5b4814aD';

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        await redeploy('AaveV3Supply');
        await redeploy('AaveV3Borrow');
        await redeploy('AaveV3ATokenPayback');
        pool = await hre.ethers.getContractAt('IL2PoolV3', AAVE_OPTIMISM_POOL);
    });
    beforeEach(async () => {
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
        await revertToSnapshot(snapshotId);
    });

    it('... should supply WETH and borrow DAI then repay part of debt using aDAI on Aave V3 on optimism', async () => {
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

        const reserveDataDAI = await pool.getReserveData(OPTIMISM_DAI);
        const amountDai = hre.ethers.utils.parseUnits('1000', 18);

        const daiBalanceBefore = await balanceOf(OPTIMISM_DAI, senderAcc.address);
        console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
        await aaveV3Borrow(proxy, AAVE_MARKET_OPTIMISM, amountDai, to, 2, reserveDataDAI.id);

        const daiBalanceAfter = await balanceOf(OPTIMISM_DAI, senderAcc.address);
        console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);

        const aDAI = reserveDataDAI.aTokenAddress;

        const daiVariableTokenDebt = reserveDataDAI.variableDebtTokenAddress;
        const debtAmountBefore = await balanceOf(daiVariableTokenDebt, proxy.address);
        console.log(`Debt before payback ${debtAmountBefore.toString()}`);

        const paybackAmount = hre.ethers.utils.parseUnits('500', 18);

        await setBalance(aDAI, from, paybackAmount);

        await approve(aDAI, proxy.address);
        const aDaiBalanceBefore = await balanceOf(aDAI, senderAcc.address);
        console.log(`aDAI on EOA before ATokenPayback: ${aDaiBalanceBefore.toString()}`);
        await aaveV3ATokenPayback(
            proxy, AAVE_MARKET_OPTIMISM, paybackAmount, from, 2, reserveDataDAI.id,
        );

        const aDaiBalanceAfter = await balanceOf(aDAI, senderAcc.address);
        console.log(`aDAI on EOA after ATokenPayback: ${aDaiBalanceAfter.toString()}`);

        const debtAmountAfter = await balanceOf(daiVariableTokenDebt, proxy.address);
        console.log(`Debt after payback ${debtAmountAfter.toString()}`);
    });

    it('... should supply WETH and borrow DAI then repay part of debt using aDAI on Aave V3 on optimism using optimised calldata', async () => {
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

        const reserveDataDAI = await pool.getReserveData(OPTIMISM_DAI);
        const amountDai = hre.ethers.utils.parseUnits('1000', 18);

        const daiBalanceBefore = await balanceOf(OPTIMISM_DAI, senderAcc.address);
        console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
        await aaveV3Borrow(proxy, AAVE_MARKET_OPTIMISM, amountDai, to, 2, reserveDataDAI.id);

        const daiBalanceAfter = await balanceOf(OPTIMISM_DAI, senderAcc.address);
        console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);

        const aDAI = reserveDataDAI.aTokenAddress;

        const daiVariableTokenDebt = reserveDataDAI.variableDebtTokenAddress;
        const debtAmountBefore = await balanceOf(daiVariableTokenDebt, proxy.address);
        console.log(`Debt before payback ${debtAmountBefore.toString()}`);

        const paybackAmount = hre.ethers.utils.parseUnits('500', 18);

        await setBalance(aDAI, from, paybackAmount);

        await approve(aDAI, proxy.address);
        const aDaiBalanceBefore = await balanceOf(aDAI, senderAcc.address);
        console.log(`aDAI on EOA before ATokenPayback: ${aDaiBalanceBefore.toString()}`);
        await aaveV3ATokenPaybackCalldataOptimised(
            proxy, AAVE_MARKET_OPTIMISM, paybackAmount, from, 2, reserveDataDAI.id,
        );

        const aDaiBalanceAfter = await balanceOf(aDAI, senderAcc.address);
        console.log(`aDAI on EOA after ATokenPayback: ${aDaiBalanceAfter.toString()}`);

        const debtAmountAfter = await balanceOf(daiVariableTokenDebt, proxy.address);
        console.log(`Debt after payback ${debtAmountAfter.toString()}`);
    });
    it('... should supply WETH and borrow DAI then repay ALL debt using aDAI on Aave V3 on optimism using optimised calldata', async () => {
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

        const reserveDataDAI = await pool.getReserveData(OPTIMISM_DAI);
        const amountDai = hre.ethers.utils.parseUnits('1000', 18);

        const daiBalanceBefore = await balanceOf(OPTIMISM_DAI, senderAcc.address);
        console.log(`DAI on EOA before borrow: ${daiBalanceBefore.toString()}`);
        await aaveV3Borrow(proxy, AAVE_MARKET_OPTIMISM, amountDai, to, 2, reserveDataDAI.id);

        const daiBalanceAfter = await balanceOf(OPTIMISM_DAI, senderAcc.address);
        console.log(`DAI on EOA after borrow: ${daiBalanceAfter.toString()}`);

        const aDAI = reserveDataDAI.aTokenAddress;

        const daiVariableTokenDebt = reserveDataDAI.variableDebtTokenAddress;
        const debtAmountBefore = await balanceOf(daiVariableTokenDebt, proxy.address);
        console.log(`Debt before payback ${debtAmountBefore.toString()}`);

        const paybackAmount = hre.ethers.utils.parseUnits('1500', 18);

        await setBalance(aDAI, from, paybackAmount);

        await approve(aDAI, proxy.address);
        const aDaiBalanceBefore = await balanceOf(aDAI, senderAcc.address);
        console.log(`aDAI on EOA before ATokenPayback: ${aDaiBalanceBefore.toString()}`);
        await aaveV3ATokenPaybackCalldataOptimised(
            proxy, AAVE_MARKET_OPTIMISM, paybackAmount, from, 2, reserveDataDAI.id,
        );

        const aDaiBalanceAfter = await balanceOf(aDAI, senderAcc.address);
        console.log(`aDAI on EOA after ATokenPayback: ${aDaiBalanceAfter.toString()}`);

        const debtAmountAfter = await balanceOf(daiVariableTokenDebt, proxy.address);
        console.log(`Debt after payback ${debtAmountAfter.toString()}`);
    });
});
