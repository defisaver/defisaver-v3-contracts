/* eslint-disable array-callback-return */
/* eslint-disable no-param-reassign */
/* eslint-disable max-len */
const hre = require('hardhat');
const { ethers } = require('hardhat');
const { expect } = require('chai');
const sdk = require('@defisaver/sdk');

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
    getAaveV3PositionInfo,
    expectTwoAaveV3PositionsToBeEqual,
} = require('../utils-aave');
const { executeAction } = require('../actions');
const { topUp } = require('../../scripts/utils/fork');

const createAaveV3ImportRecipe = ({
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

        ...debtAssetIds.map((debtAssetId, i) => new sdk.actions.aaveV3.AaveV3PaybackAction(
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

        new sdk.actions.aaveV3.AaveV3CollateralSwitchAction(
            true,
            nullAddress,
            collAssetIds.length,
            collAssetIds,
            useAsCollateralFlags,
        ),

        new sdk.actions.aaveV3.AaveV3SetEModeAction(true, nullAddress, emodeCategoryId),

        ...debtAssetIds.map((debtAssetId, i) => new sdk.actions.aaveV3.AaveV3BorrowAction(
            true,
            nullAddress,
            debtAmounts[i],
            flAddress,
            VARIABLE_RATE,
            debtAssetId,
            false,
        )),
    ];
    return new sdk.Recipe('InstDsaAaveV3Import', actions);
};

describe('DSA-AaveV3-Import', function () {
    this.timeout(1_000_000);

    const isFork = hre.network.name === 'fork';
    const dsaAddress = '0x999CBD9Dc31A471aFEa801B0995D86aB3303Be8B';
    const userAddress = '0xb94c575bFfDc7aB6EC97ad55A9007E2C924A8484';

    let aaveV3View;
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

        aaveV3View = await getContractFromRegistry('AaveV3View', addrs[network].REGISTRY_ADDR, false, isFork);
        const flContract = await getContractFromRegistry('FLAction', addrs[network].REGISTRY_ADDR, false, isFork);
        flAddress = flContract.address;

        await redeploy('InstPullTokens', addrs[network].REGISTRY_ADDR, false, isFork);
        wallet = await getProxy(userAddress, hre.config.isWalletSafe);
        wallet = wallet.connect(userAcc);

        dsaPositionInfo = await getAaveV3PositionInfo(dsaAddress, aaveV3View);
        console.log('DSA aaveV3 position before:', dsaPositionInfo);

        if (!isFork) {
            await impersonateAccount(userAcc.address);
        }
    });

    it('... should execute AaveV3 migration from DSA to DFS smart wallet', async () => {
        // approve smart wallet from DSA
        const ABI = [
            'function add(address)',
        ];
        const iface = new hre.ethers.utils.Interface(ABI);
        const data = iface.encodeFunctionData('add', [wallet.address]);
        await dsaProxy.cast(['AUTHORITY-A'], [data], userAddress);

        const recipe = createAaveV3ImportRecipe({
            walletAddress: wallet.address,
            dsaProxyAddress: dsaAddress,
            flAddress,

            ...dsaPositionInfo,
        });

        await executeAction('RecipeExecutor', recipe.encodeForDsProxyCall()[1], wallet);

        const dfsMigratedPosition = await getAaveV3PositionInfo(wallet.address, aaveV3View);
        expectTwoAaveV3PositionsToBeEqual(dsaPositionInfo, dfsMigratedPosition);

        const currentDsaPositionRatios = await aaveV3View.getRatios(addrs[network].AAVE_MARKET, [dsaAddress]);
        expect(currentDsaPositionRatios[0]).to.be.eq(0);
    });
});
