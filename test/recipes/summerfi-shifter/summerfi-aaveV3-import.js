/* eslint-disable array-callback-return */
/* eslint-disable no-param-reassign */
/* eslint-disable max-len */
const hre = require("hardhat");
const { ethers } = require("hardhat");
const { expect } = require("chai");
const sdk = require("@defisaver/sdk");

const {
    impersonateAccount,
    nullAddress,
    MAX_UINT,
    addrs,
    getProxy,
    getContractFromRegistry,
    redeploy,
    getGasUsed,
    network,
    getOwnerAddr,
    sendEther,
} = require("../../utils/utils");
const { VARIABLE_RATE, getAaveReserveData } = require("../../utils/aave");
const { executeAction } = require("../../utils/actions");
const { topUp } = require("../../../scripts/utils/fork");

const createAaveV3ImportRecipe = ({
    proxyAddress,
    oasisProxyAddress,
    flAddress,

    collAssetIds,
    collATokenAddresses,
    useAsCollateralFlags,
    collAmounts,

    emodeCategoryId,
    debtTokenAddresses,
    debtAssetIds,
    debtAmounts,
}) => {
    debtAmounts = debtAmounts.map((e) => e.mul(1_00_01).div(1_00_00));
    const actions = [
        new sdk.actions.flashloan.FLAction(
            new sdk.actions.flashloan.BalancerFlashLoanAction(debtTokenAddresses, debtAmounts)
        ),

        ...debtAssetIds.map(
            (debtAssetId, i) =>
                new sdk.actions.aaveV3.AaveV3PaybackAction(
                    true,
                    nullAddress,
                    MAX_UINT,
                    proxyAddress,
                    VARIABLE_RATE,
                    debtTokenAddresses[i],
                    debtAssetId,
                    true,
                    oasisProxyAddress
                )
        ),

        new sdk.actions.summerfi.SFApproveTokensAction(
            oasisProxyAddress,
            proxyAddress,
            collATokenAddresses,
            collAmounts.map((e) => e.mul(100_01).div(100_00))
        ),

        ...collATokenAddresses.map(
            (collATokenAddress) =>
                new sdk.actions.basic.PullTokenAction(
                    collATokenAddress,
                    oasisProxyAddress,
                    MAX_UINT
                )
        ),

        new sdk.actions.aaveV3.AaveV3CollateralSwitchAction(
            true,
            nullAddress,
            collAssetIds.length,
            collAssetIds,
            useAsCollateralFlags
        ),

        new sdk.actions.aaveV3.AaveV3SetEModeAction(true, nullAddress, emodeCategoryId),

        ...debtAssetIds.map(
            (debtAssetId, i) =>
                new sdk.actions.aaveV3.AaveV3BorrowAction(
                    true,
                    nullAddress,
                    debtAmounts[i],
                    flAddress,
                    VARIABLE_RATE,
                    debtAssetId,
                    false
                )
        ),
    ];
    return new sdk.Recipe("SummerFiAaveV3Import", actions);
};

const getPositionInfo = async (user, aaveV3View) => {
    const market = addrs[network].AAVE_MARKET;
    const pool = await ethers
        .getContractAt("IPoolAddressesProvider", market)
        .then((c) => ethers.getContractAt("IPoolV3", c.getPool()));
    const {
        eMode: emodeCategoryId,
        collAddr,
        enabledAsColl,
        borrowAddr,
    } = await aaveV3View.getLoanData(market, user);

    const collTokenAddresses = collAddr.filter((e) => e !== nullAddress);
    const useAsCollateralFlags = enabledAsColl.slice(0, collTokenAddresses.length);
    const debtTokenAddresses = borrowAddr.filter((e) => e !== nullAddress);

    const { collAssetIds, collATokenAddresses } = await Promise.all(
        collTokenAddresses.map(async (c) => getAaveReserveData(pool, c))
    ).then((arr) =>
        arr.reduce(
            (acc, { id, aTokenAddress }) => ({
                collAssetIds: [...acc.collAssetIds, id],
                collATokenAddresses: [...acc.collATokenAddresses, aTokenAddress],
            }),
            {
                collAssetIds: [],
                collATokenAddresses: [],
            }
        )
    );

    const { debtAssetIds } = await Promise.all(
        debtTokenAddresses.map(async (c) => getAaveReserveData(pool, c))
    ).then((arr) =>
        arr.reduce(
            (acc, { id }) => ({
                debtAssetIds: [...acc.debtAssetIds, id],
            }),
            {
                debtAssetIds: [],
            }
        )
    );

    const debtAmounts = await aaveV3View
        .getTokenBalances(market, user, debtTokenAddresses)
        .then((r) => r.map(({ borrowsVariable }) => borrowsVariable));

    const collAmounts = await aaveV3View
        .getTokenBalances(market, user, collTokenAddresses)
        .then((r) => r.map(({ balance }) => balance));

    return {
        collAssetIds,
        collATokenAddresses,
        useAsCollateralFlags,
        collAmounts,

        emodeCategoryId,
        debtTokenAddresses,
        debtAssetIds,
        debtAmounts,
    };
};

const validatePositionShift = (oldPosition, newPosition) => {
    expect(oldPosition.emodeCategoryId).to.be.eq(newPosition.emodeCategoryId);
    oldPosition.collAssetIds.map((e, i) => expect(e).to.be.eq(newPosition.collAssetIds[i]));
    oldPosition.collATokenAddresses.map((e, i) =>
        expect(e).to.be.eq(newPosition.collATokenAddresses[i])
    );
    oldPosition.useAsCollateralFlags.map((e, i) =>
        expect(e).to.be.eq(newPosition.useAsCollateralFlags[i])
    );
    oldPosition.debtTokenAddresses.map((e, i) =>
        expect(e).to.be.eq(newPosition.debtTokenAddresses[i])
    );
    oldPosition.debtAssetIds.map((e, i) => expect(e).to.be.eq(newPosition.debtAssetIds[i]));

    oldPosition.collAmounts.map((e, i) => {
        expect(newPosition.collAmounts[i]).to.be.gte(e);
        expect(newPosition.collAmounts[i].sub(e)).to.be.lte(e.div(100_00));
    });
    oldPosition.debtAmounts.map((e, i) => {
        expect(newPosition.debtAmounts[i]).to.be.gte(e);
        expect(newPosition.debtAmounts[i].sub(e)).to.be.lte(e.div(100_00));
    });
};

describe("Summerfi-AaveV3-Import", function () {
    this.timeout(1_000_000);

    const isFork = hre.network.name === "fork";
    const sfProxyAddress = "0x840CFfA2a3a6F56Eb2f205a06748a8284b683355";

    let aaveV3View;
    let flAddress;
    let sfProxy;
    let userAcc;
    let wallet;
    let sfPositionInfo;

    before(async () => {
        console.log("isFork", isFork);

        const userAddress = await ethers
            .getContractAt("IDSProxy", sfProxyAddress)
            .then((e) => e.owner());
        userAcc = await ethers.getSigner(userAddress);

        if (isFork) {
            await topUp(userAcc.address);
            await topUp(getOwnerAddr());
        }

        // send some eth to userAcc
        const zeroAddress = hre.ethers.constants.AddressZero;
        const zeroAcc = await hre.ethers.provider.getSigner(zeroAddress);
        await impersonateAccount(zeroAddress);
        await sendEther(zeroAcc, userAcc.address, "5");

        sfProxy = await ethers.getContractAt("IDSProxy", sfProxyAddress);
        sfProxy = sfProxy.connect(userAcc);

        aaveV3View = await getContractFromRegistry("AaveV3View", isFork);
        const flContract = await getContractFromRegistry("FLAction", isFork);
        flAddress = flContract.address;

        await redeploy("SFApproveTokens", isFork);
        wallet = await getProxy(userAddress, hre.config.isWalletSafe);
        wallet = wallet.connect(userAcc);

        sfPositionInfo = await getPositionInfo(sfProxyAddress, aaveV3View);
        console.log("Summer.fi user aaveV3 position before:", sfPositionInfo);

        if (!isFork) {
            await impersonateAccount(userAcc.address);
        }
    });

    it("... should send permit Tx then execute import recipe with SFApproveTokens action", async () => {
        const guard = await ethers.getContractAt("IAccountGuard", await sfProxy.guard());
        let tx = await guard.connect(userAcc).permit(wallet.address, sfProxyAddress, true);
        await getGasUsed(tx).then((e) => console.log("Gas used summer.fi permit:", e));

        const recipe = createAaveV3ImportRecipe({
            proxyAddress: wallet.address,
            oasisProxyAddress: sfProxyAddress,
            flAddress,

            ...sfPositionInfo,
        });

        tx = await executeAction("RecipeExecutor", recipe.encodeForDsProxyCall()[1], wallet);

        const dfsMigratedPosition = await getPositionInfo(wallet.address, aaveV3View);
        validatePositionShift(sfPositionInfo, dfsMigratedPosition);

        const currentSfPositionRatios = await aaveV3View.getRatios(addrs[network].AAVE_MARKET, [
            sfProxyAddress,
        ]);
        expect(currentSfPositionRatios[0]).to.be.eq(0);

        tx = await guard.connect(userAcc).permit(wallet.address, sfProxyAddress, false);
        await getGasUsed(tx).then((e) => console.log("Gas used summer.fi permit:", e));
    });
});

module.exports = {
    createAaveV3ImportRecipe,
};
