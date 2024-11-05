/* eslint-disable array-callback-return */
/* eslint-disable no-param-reassign */
/* eslint-disable max-len */
const hre = require('hardhat');
const { ethers } = require('hardhat');
const sdk = require('@defisaver/sdk');
const { expect } = require('chai');

const {
    impersonateAccount,
    nullAddress,
    MAX_UINT,
    addrs,
    getProxy,
    getContractFromRegistry,
    redeploy,
    network,
    getOwnerAddr,
} = require('../utils');
const {
    VARIABLE_RATE,
} = require('../utils-aave');
const { executeAction } = require('../actions');
const { topUp } = require('../../scripts/utils/fork');
const { getSparkPositionInfo, expectTwoSparkPositionsToBeEqual } = require('../utils-spark');

const createSparkImportRecipe = ({
    walletAddress,
    dsaProxyAddress,
    flAddress,

    collAssetIds,
    collATokenAddresses,
    useAsCollateralFlags,

    emodeCategoryId,
    debtTokenAddresses,
    debtAssetIds,
    debtAmounts,
}) => {
    debtAmounts = debtAmounts.map((e) => e.mul(1_00_01).div(1_00_00));
    const actions = [
        new sdk.actions.flashloan.FLAction(new sdk.actions.flashloan.BalancerFlashLoanAction(
            debtTokenAddresses,
            debtAmounts,
        )),

        ...debtAssetIds.map((debtAssetId, i) => new sdk.actions.spark.SparkPaybackAction(
            true,
            nullAddress,
            MAX_UINT,
            walletAddress,
            VARIABLE_RATE,
            debtTokenAddresses[i],
            debtAssetId,
            true,
            dsaProxyAddress,
        )),

        new sdk.actions.insta.InstPullTokensAction(
            dsaProxyAddress,
            collATokenAddresses,
            Array(collATokenAddresses.length).fill(MAX_UINT),
            walletAddress,
        ),

        new sdk.actions.spark.SparkCollateralSwitchAction(
            true,
            nullAddress,
            collAssetIds.length,
            collAssetIds,
            useAsCollateralFlags,
        ),

        new sdk.actions.spark.SparkSetEModeAction(true, nullAddress, emodeCategoryId),

        ...debtAssetIds.map((debtAssetId, i) => new sdk.actions.spark.SparkBorrowAction(
            true,
            nullAddress,
            debtAmounts[i],
            flAddress,
            VARIABLE_RATE,
            debtAssetId,
            false,
        )),
    ];
    return new sdk.Recipe('InstDsaSparkV3Import', actions);
};

describe('DSA-Spark-Import', function () {
    this.timeout(1_000_000);

    const isFork = hre.network.name === 'fork';
    const dsaAddress = 'e857212ea30bd0efabb33c584db3929771d71490';
    const userAddress = 'a8715c3527804d053b20e8eab8a14e4d1d944247';

    let sparkView;
    let flAddress;
    let dsaProxy;
    let userAcc;
    let wallet;
    let dsaPositionInfo;

    before(async () => {
        console.log('isFork', isFork);

        userAcc = await ethers.getSigner(userAddress);

        if (isFork) {
            await topUp(userAcc.address);
            await topUp(getOwnerAddr());
        }

        dsaProxy = await hre.ethers.getContractAt('IInstaAccountV2', dsaAddress);
        dsaProxy = dsaProxy.connect(userAcc);

        sparkView = await getContractFromRegistry('SparkView', addrs[network].REGISTRY_ADDR, false, isFork);
        const flContract = await getContractFromRegistry('FLAction', addrs[network].REGISTRY_ADDR, false, isFork);
        flAddress = flContract.address;

        await redeploy('InstPullTokens', addrs[network].REGISTRY_ADDR, false, isFork);
        wallet = await getProxy(userAddress, hre.config.isWalletSafe);
        wallet = wallet.connect(userAcc);

        dsaPositionInfo = await getSparkPositionInfo(dsaAddress, sparkView);
        console.log('DSA spark position before:', dsaPositionInfo);

        if (!isFork) {
            await impersonateAccount(userAcc.address);
        }
    });

    it('... should execute Spark migration from DSA to DFS smart wallet', async () => {
        // approve smart wallet from DSA
        const ABI = [
            'function add(address)',
        ];
        const iface = new hre.ethers.utils.Interface(ABI);
        const data = iface.encodeFunctionData('add', [wallet.address]);
        await dsaProxy.cast(['AUTHORITY-A'], [data], userAddress);

        const recipe = createSparkImportRecipe({
            walletAddress: wallet.address,
            dsaProxyAddress: dsaAddress,
            flAddress,

            ...dsaPositionInfo,
        });

        await executeAction('RecipeExecutor', recipe.encodeForDsProxyCall()[1], wallet);

        const dfsMigratedPosition = await getSparkPositionInfo(wallet.address, sparkView);
        expectTwoSparkPositionsToBeEqual(dsaPositionInfo, dfsMigratedPosition);

        const currentDsaPositionRatios = await sparkView.getRatios(addrs[network].SPARK_MARKET, [dsaAddress]);
        expect(currentDsaPositionRatios[0]).to.be.eq(0);
    });
});
