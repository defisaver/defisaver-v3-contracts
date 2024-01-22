const { ethers } = require('hardhat');
const { expect } = require('chai');
const dfs = require('@defisaver/sdk');
const {
    getProxy,
    redeploy,
    addrs,
    getNetwork,
    setBalance,
} = require('../../utils');
const { supplyCompV3, borrowCompV3, allowCompV3 } = require('../../actions');
const { executeSafeTx } = require('../../utils-safe');

describe('Safe-CompV3-Shift-Position', function () {
    this.timeout(200000);

    const market = addrs[getNetwork()].COMET_USDC_ADDR;

    let senderAcc;
    let proxy;
    let safe;
    let flAction;
    let recipeExecutor;
    let compV3View;

    const createCompV3Position = async (positionData) => {
        await setBalance(positionData.collAddr, senderAcc.address, positionData.collAmount);
        await supplyCompV3(
            market,
            proxy,
            positionData.collAddr,
            positionData.collAmount,
            senderAcc.address,
            proxy.address,
            false,
            senderAcc,
        );
        await borrowCompV3(
            market,
            proxy,
            positionData.debtAmount,
            proxy.address,
            senderAcc.address,
        );
    };

    const createShiftRecipe = async (positionData) => {
        const debtAmount = positionData.debtAmount.mul(1_00_01).div(1_00_00);

        const flashloanAction = new dfs.actions.flashloan.FLAction(
            new dfs.actions.flashloan.BalancerFlashLoanAction(
                [positionData.debtAddr],
                [debtAmount],
            ),
        );
        const paybackAction = new dfs.actions.compoundV3.CompoundV3PaybackAction(
            market,
            ethers.constants.MaxUint256, // repay hole debt,
            safe.address, // from
            proxy.address, // on behalf of
            positionData.debtAddr,
        );
        // withdraw from ds proxy to safe, previous approval needed
        const withdrawAction = new dfs.actions.compoundV3.CompoundV3WithdrawAction(
            market,
            safe.address, // to
            positionData.collAddr,
            ethers.constants.MaxUint256, // withdraw hole collateral
            proxy.address, // on behalf of
        );
        const supplyAction = new dfs.actions.compoundV3.CompoundV3SupplyAction(
            market,
            positionData.collAddr,
            ethers.constants.MaxUint256, // supply hole balance of collAddr
            safe.address, // from
            safe.address,
        );
        const borrowAction = new dfs.actions.compoundV3.CompoundV3BorrowAction(
            market,
            '$1', // FL amount
            flAction.address,
            safe.address,
        );
        return new dfs.Recipe('ShiftCompV3PositionToSafe', [
            flashloanAction,
            paybackAction,
            withdrawAction,
            supplyAction,
            borrowAction,
        ]);
    };

    const approveSafeToActOnBehalfOfProxy = async () => {
        await allowCompV3(
            market,
            proxy,
            safe.address,
            true,
        );
    };

    const removeSafeApproval = async () => {
        await allowCompV3(
            market,
            proxy,
            safe.address,
            false,
        );
    };

    const migratePositionToSafeTx = async (positionData) => {
        const shiftPositionRecipe = await createShiftRecipe(positionData);
        const recipeData = shiftPositionRecipe.encodeForDsProxyCall()[1];

        await executeSafeTx(
            senderAcc.address,
            safe,
            recipeExecutor.address,
            recipeData,
        );
    };
    const validateMigration = async (positionData, proxyLoanBefore) => {
        const proxyLoanAfter = await compV3View.getLoanData(
            market,
            proxy.address,
        );
        const safeLoanAfter = await compV3View.getLoanData(
            market,
            safe.address,
        );

        proxyLoanAfter.collAmounts.forEach((c) => expect(c).to.be.eq(ethers.BigNumber.from('0')));
        expect(proxyLoanAfter.borrowAmount).to.be.eq(ethers.BigNumber.from('0'));

        let safeCollAmount;
        safeLoanAfter.collAddr.forEach((c, i) => {
            if (positionData.collAddr.toLowerCase() === c.toLowerCase()) {
                safeCollAmount = safeLoanAfter.collAmounts[i];
            }
        });
        expect(safeCollAmount).to.be.eq(positionData.collAmount);
        expect(safeLoanAfter.borrowAmount).to.be.gte(proxyLoanBefore.borrowAmount);
    };

    before(async () => {
        flAction = await redeploy('FLAction');
        recipeExecutor = await redeploy('RecipeExecutor');
        compV3View = await redeploy('CompV3View');
        await redeploy('CompV3Payback');
        await redeploy('CompV3Borrow');
        await redeploy('CompV3Supply');
        await redeploy('CompV3Allow');
        await redeploy('CompV3Withdraw');

        senderAcc = (await ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address, false);
        safe = await getProxy(senderAcc.address, true);
    });

    it('... should shift compV3 position from dsProxy to safe', async () => {
        const positionData = {
            collAddr: addrs[getNetwork()].WETH_ADDRESS,
            collAmount: ethers.utils.parseUnits('10', 18),
            debtAddr: addrs[getNetwork()].USDC_ADDR,
            debtAmount: ethers.utils.parseUnits('10000', 6),
        };
        await createCompV3Position(positionData);

        const proxyLoanBefore = await compV3View.getLoanData(
            market,
            proxy.address,
        );

        await approveSafeToActOnBehalfOfProxy();

        await migratePositionToSafeTx(positionData);

        await validateMigration(positionData, proxyLoanBefore);

        await removeSafeApproval();
    });
});
