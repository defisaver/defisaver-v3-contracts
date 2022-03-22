const { expect } = require('chai');
const dfs = require('@defisaver/sdk');

const hre = require('hardhat');

const {
    getProxy, balanceOf, setBalance, approve, getGasUsed,
} = require('../utils');
const { deployContract } = require('../../scripts/utils/deployer');

describe('Aave-Supply-L2', function () {
    this.timeout(150000);

    let senderAcc; let proxy; let aaveContract; let aaveSetEModeContract;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        aaveContract = await deployContract('AaveV3Supply');
        aaveSetEModeContract = await deployContract('AaveV3SetEMode');
    });

    it('... should supply WETH to Aave V3 optimism', async () => {
        const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
        const aWETH = '0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8';

        const amount = hre.ethers.utils.parseUnits('10', 18);
        await setBalance(WETH_ADDRESS, senderAcc.address, amount);

        const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
        console.log(wethBalanceBefore.toString());

        await approve(WETH_ADDRESS, proxy.address);

        const AAVE_MARKET_OPTIMISM = '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb';

        aaveContract = await aaveContract.connect(senderAcc);

        const pool = await hre.ethers.getContractAt('IL2PoolV3', '0x794a61358D6845594F94dc1DB02A252b5b4814aD');

        const reserveData = await pool.getReserveData(WETH_ADDRESS);
        console.log(reserveData.id);

        const aaveSupplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
            AAVE_MARKET_OPTIMISM, amount, senderAcc.address, reserveData.id, true, false,
        );
        const functionData = aaveSupplyAction.encodeForDsProxyCall()[1];
        console.log(functionData);

        const balanceBefore = await balanceOf(aWETH, proxy.address);
        console.log(balanceBefore.toString());
        const receipt = await proxy['execute(address,bytes)'](aaveContract.address, functionData, { gasLimit: 3000000 });

        const gasUsed = await getGasUsed(receipt);
        console.log(`GasUsed aaveSupply; ${gasUsed}`);
        console.log(receipt);
        const balanceAfter = await balanceOf(aWETH, proxy.address);
        console.log(balanceAfter.toString());

        let userEmode = await pool.getUserEMode(proxy.address);
        console.log(userEmode);

        const setEmodeAction = new dfs.actions.aaveV3.AaveV3SetEModeAction(
            AAVE_MARKET_OPTIMISM, 1,
        );
        const setEmodeFunctionData = setEmodeAction.encodeForDsProxyCall()[1];
        const setEModeReceipt = await proxy['execute(address,bytes)'](aaveSetEModeContract.address, setEmodeFunctionData, { gasLimit: 3000000 });

        userEmode = await pool.getUserEMode(proxy.address);
        console.log(userEmode);
    });
});
