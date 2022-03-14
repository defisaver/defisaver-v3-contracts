const { expect } = require('chai');
const dfs = require('@defisaver/sdk');

const { getAssetInfo } = require('@defisaver/tokens');
const hre = require('hardhat');

const {
    getProxy, balanceOf, setBalance, approve, nullAddress, getGasUsed,
} = require('../../utils');
const { deployContract } = require('../../../scripts/utils/deployer');

describe('Aave-Supply-L2', function () {
    this.timeout(150000);

    let senderAcc; let proxy; let aaveContract;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        aaveContract = await deployContract('AaveV3Supply');
    });

    it('... should supply to Aave V3 on kovan optimism', async () => {
        const WETH_ADDRESS = '0x0AB1917A0cf92cdcf7F7b637EaC3A46BBBE41409';
        const aWETH = '0x27271c499C0545592dB80eBc60fE888c8f15dc79';

        const amount = hre.ethers.utils.parseUnits('10', 18);
        await setBalance(WETH_ADDRESS, senderAcc.address, amount);

        const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
        console.log(wethBalanceBefore.toString());

        await approve(WETH_ADDRESS, proxy.address);

        const AAVE_MARKET_KOVAN_OPTIMISM = '0xFc7215C9498Fc12b22Bc0ed335871Db4315f03d3';

        aaveContract = await aaveContract.connect(senderAcc);

        const pool = await hre.ethers.getContractAt('IPoolV3', '0x3Ee0444c892aAD6B225Ef20551116f79C52554AA');

        const reserveData = await pool.getReserveData(WETH_ADDRESS);
        console.log(reserveData.id);

        const encodedArgs = await aaveContract.encodeInputs([
            AAVE_MARKET_KOVAN_OPTIMISM,
            amount,
            senderAcc.address,
            reserveData.id,
            true,
            false,
            nullAddress,
        ]);

        console.log(encodedArgs);
        const aaveSupplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
            encodedArgs,
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
    });
});
