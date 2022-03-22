const { expect } = require('chai');
const dfs = require('@defisaver/sdk');

const hre = require('hardhat');

const {
    getProxy, balanceOf, setBalance, approve, getGasUsed, redeploy, gibETH,
} = require('../utils');
const { deployContract } = require('../../scripts/utils/deployer');

describe('AaveV3-Payback-L2', function () {
    this.timeout(150000);

    let senderAcc; let proxy; let aaveSupplyContract;
    let aaveBorrowContract; let aavePaybackContract;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        await gibETH(senderAcc.address);
        proxy = await getProxy(senderAcc.address);
        aaveSupplyContract = await redeploy('AaveV3Supply');
        aaveBorrowContract = await redeploy('AaveV3Borrow');
        aavePaybackContract = await redeploy('AaveV3ATokenPayback');
    });

    it('... should supply WETH and borrow DAI then repay the debt to Aave V3 on optimism', async () => {
        const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
        const aWETH = '0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8';

        const amount = hre.ethers.utils.parseUnits('10', 18);
        await setBalance(WETH_ADDRESS, senderAcc.address, amount);

        const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
        console.log(wethBalanceBefore.toString());

        await approve(WETH_ADDRESS, proxy.address);

        const AAVE_MARKET_OPTIMISM = '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb';

        aaveSupplyContract = await aaveSupplyContract.connect(senderAcc);

        const pool = await hre.ethers.getContractAt('IL2PoolV3', '0x794a61358D6845594F94dc1DB02A252b5b4814aD');

        const reserveData = await pool.getReserveData(WETH_ADDRESS);
        console.log(reserveData.id);

        const aaveSupplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
            AAVE_MARKET_OPTIMISM, amount, senderAcc.address, reserveData.id, true, false,
        );
        let functionData = aaveSupplyAction.encodeForDsProxyCall()[1];
        console.log(functionData);

        const balanceBefore = await balanceOf(aWETH, proxy.address);
        console.log(balanceBefore.toString());
        const receipt = await proxy['execute(address,bytes)'](aaveSupplyContract.address, functionData, { gasLimit: 3000000 });

        const gasUsed = await getGasUsed(receipt);
        console.log(`GasUsed aaveSupply; ${gasUsed}`);
        console.log(receipt);
        const balanceAfter = await balanceOf(aWETH, proxy.address);
        console.log(balanceAfter.toString());

        const OPITMISM_DAI = '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1';
        const reserveDataDAI = await pool.getReserveData(OPITMISM_DAI);
        const amountDai = hre.ethers.utils.parseUnits('1000', 18);

        const aaveBorrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
            AAVE_MARKET_OPTIMISM, amountDai, senderAcc.address, 2, reserveDataDAI.id, false,
        );
        functionData = aaveBorrowAction.encodeForDsProxyCall()[1];

        const daiBalanceBefore = await balanceOf(OPITMISM_DAI, senderAcc.address);
        console.log(daiBalanceBefore.toString());
        const receiptBorrow = await proxy['execute(address,bytes)'](aaveBorrowContract.address, functionData, { gasLimit: 3000000 });
        const daiBalanceAfter = await balanceOf(OPITMISM_DAI, senderAcc.address);
        console.log(daiBalanceAfter.toString());

        await setBalance(reserveDataDAI.aTokenAddress, senderAcc.address, amountDai);
        await approve(reserveDataDAI.aTokenAddress, proxy.address);

        const aavePaybackAction = new dfs.actions.aaveV3.AaveV3ATokenAPaybackAction(
            AAVE_MARKET_OPTIMISM, amountDai, senderAcc.address, 2, reserveDataDAI.id,
        );
        functionData = aavePaybackAction.encodeForDsProxyCall()[1];
        const daiVariableTokenDebt = '0x8619d80FB0141ba7F184CbF22fd724116D9f7ffC';
        const debtAmountBefore = await balanceOf(daiVariableTokenDebt, proxy.address);
        console.log(`DEBT BEFORE ${debtAmountBefore.toString()}`);
        //await approve(OPITMISM_DAI, proxy.address);

        const receiptPayback = await proxy['execute(address,bytes)'](aavePaybackContract.address, functionData, { gasLimit: 3000000 });
        const daiBalanceAfterPayback = await balanceOf(OPITMISM_DAI, senderAcc.address);
        console.log(daiBalanceAfterPayback.toString());
        const debtAmountAfter = await balanceOf(daiVariableTokenDebt, proxy.address);
        console.log(`DEBT AFTER ${debtAmountAfter.toString()}`);
    });
});
