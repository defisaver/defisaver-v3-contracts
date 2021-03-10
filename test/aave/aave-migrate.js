
require('dotenv').config();

const { expect } = require("chai");

const { getAssetInfo } = require('@defisaver/tokens');
const { tenderlyRPC } = require('hardhat');
// const hre = require("hardhat");

const dfs = require('@defisaver/sdk')

const {
    getAddrFromRegistry,
    getProxyWithSigner,
    redeploy,
    send,
    nullAddress,
    REGISTRY_ADDR,
    MAX_UINT,
    sendEther,
    impersonateAccount,
    balanceOf,
} = require('../utils');

const {
    getAaveTokenInfo,
    getAaveDataProvider,
} = require('../utils-aave');


describe("AaveMigration", function() {

    let postDeployHead, provider, flAaveId, aaveV1View, aaveView, dataProvider;

    const lendingPoolAddrProvider = '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5';

    before(async () => {

        await redeploy("FLCustomAaveV2");
        aaveV1View = await redeploy("AaveV1FullPositionView");
        await redeploy("AavePaybackV1");
        await redeploy("AaveWithdrawV1");
        await redeploy("TaskExecutor");
        await redeploy("AaveSupply");
        aaveView = await redeploy("AaveView");
        dataProvider = await getAaveDataProvider();

        this.timeout(40000);

        flAaveId = ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes('FLCustomAaveV2'));
        aaveSupplyId = ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes('AaveSupply'));
        aavePaybackV1Id = ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes('AavePaybackV1'));
        aaveWithdrawV1Id = ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes('AaveWithdrawV1'));
    })

    it('... should get an Eth Aave flash loan', async () => {

        const TEST_ACC = '0x0a80C3C540eEF99811f4579fa7b1A0617294e06f';

        const supplierAcc = (await hre.ethers.getSigners())[0];

        await impersonateAccount(TEST_ACC);

        const senderAcc = await hre.ethers.provider.getSigner(TEST_ACC);
        const proxy = await getProxyWithSigner(senderAcc, TEST_ACC);

        proxy.connect(senderAcc);

        // send eth to test acc so it can run transaction
        await sendEther(supplierAcc, TEST_ACC, "0.5")

        const taskExecutorAddr = await getAddrFromRegistry('TaskExecutor');
        const tokens = [getAssetInfo('DAI').address, getAssetInfo('MANA').address, getAssetInfo('REN').address];

        const abiCoder = new ethers.utils.AbiCoder();
        const flData = abiCoder.encode(['address','address[]'], [proxy.address,tokens]);

        const flashloan = new dfs.actions.flashloan.AaveCustomFlashLoanV2Action(
            aaveV1View.address, proxy.address, flData
        );

        const paybackDai = new dfs.actions.aaveV1.AavePaybackActionV1(getAssetInfo('DAI').address, MAX_UINT, proxy.address, proxy.address);
        const paybackMana = new dfs.actions.aaveV1.AavePaybackActionV1(getAssetInfo('MANA').address, MAX_UINT, proxy.address, proxy.address);
        const paybackRen = new dfs.actions.aaveV1.AavePaybackActionV1(getAssetInfo('REN').address, MAX_UINT, proxy.address, proxy.address);
        const withdrawEth = new dfs.actions.aaveV1.AaveWithdrawActionV1(getAssetInfo('ETH').address, MAX_UINT, proxy.address);
        const withdrawDai = new dfs.actions.aaveV1.AaveWithdrawActionV1(getAssetInfo('DAI').address, MAX_UINT, proxy.address);
        const supplyEth = new dfs.actions.aave.AaveSupplyAction(lendingPoolAddrProvider, getAssetInfo('ETH').address, MAX_UINT, proxy.address, proxy.address);
        const supplyDai = new dfs.actions.aave.AaveSupplyAction(lendingPoolAddrProvider, getAssetInfo('DAI').address, MAX_UINT, proxy.address, proxy.address);

        const migrationRecipe = new dfs.Recipe("MigrationRecipe", [
            flashloan,
            paybackDai,
            paybackMana,
            paybackRen,
            withdrawEth,
            withdrawDai,
            supplyEth,
            supplyDai
        ]);
        const functionData = migrationRecipe.encodeForDsProxyCall();
        

        // value needed because of aave fl fee
        await proxy['execute(address,bytes)'](taskExecutorAddr, functionData[1], {value: ethers.utils.parseEther("0.01"), gasLimit: 6900000});
    });
 
});