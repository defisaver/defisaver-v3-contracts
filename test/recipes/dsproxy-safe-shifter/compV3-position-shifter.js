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
const {
    supplyCompV3, borrowCompV3, executeAction,
} = require('../../actions');
const { signSafeTx } = require('../../utils-safe');

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

    const migrationTxCallData = async (positionData) => {
        const debtAmount = positionData.debtAmount.mul(10_001).div(10_000);

        const flashloanAction = new dfs.actions.flashloan.FLAction(
            new dfs.actions.flashloan.BalancerFlashLoanAction(
                [positionData.debtAddr],
                [debtAmount],
            ),
        );
        const paybackAction = new dfs.actions.compoundV3.CompoundV3PaybackAction(
            market,
            ethers.constants.MaxUint256, // repay whole debt,
            safe.address, // from
            proxy.address, // on behalf of
            positionData.debtAddr,
        );
        // withdraw from ds proxy to safe, previous approval needed
        const withdrawAction = new dfs.actions.compoundV3.CompoundV3WithdrawAction(
            market,
            safe.address, // to
            positionData.collAddr,
            ethers.constants.MaxUint256, // withdraw whole collateral
            proxy.address, // on behalf of
        );
        const supplyAction = new dfs.actions.compoundV3.CompoundV3SupplyAction(
            market,
            positionData.collAddr,
            ethers.constants.MaxUint256, // supply whole balance of collAddr
            safe.address, // from
            safe.address,
        );
        const borrowAction = new dfs.actions.compoundV3.CompoundV3BorrowAction(
            market,
            '$1', // FL amount
            flAction.address,
            safe.address,
        );
        const recipe = new dfs.Recipe('ShiftCompV3PositionToSafe', [
            flashloanAction,
            paybackAction,
            withdrawAction,
            supplyAction,
            borrowAction,
        ]);
        return recipe.encodeForDsProxyCall()[1];
    };

    const executeMigrationInOneTx = async (positionData) => {
        const safeTxParams = {
            to: recipeExecutor.address,
            value: 0,
            data: await migrationTxCallData(positionData),
            operation: 1,
            safeTxGas: 0,
            baseGas: 0,
            gasPrice: 0,
            gasToken: ethers.constants.AddressZero,
            refundReceiver: ethers.constants.AddressZero,
            nonce: await safe.nonce(),
        };
        const signature = await signSafeTx(safe, safeTxParams, senderAcc);

        const compV3GiveAllowanceAction = new dfs.actions.compoundV3.CompoundV3AllowAction(
            market,
            safe.address,
            true,
        );
        const executeSafeTxAction = new dfs.actions.basic.ExecuteSafeTxAction(
            safe.address,
            safeTxParams.to,
            safeTxParams.value,
            safeTxParams.data,
            safeTxParams.operation,
            safeTxParams.safeTxGas,
            safeTxParams.baseGas,
            safeTxParams.gasPrice,
            safeTxParams.gasToken,
            safeTxParams.refundReceiver,
            signature,
        );
        const compV3RemoveAllowanceAction = new dfs.actions.compoundV3.CompoundV3AllowAction(
            market,
            safe.address,
            false,
        );
        const recipe = new dfs.Recipe('ShiftCompV3PositionToSafe', [
            compV3GiveAllowanceAction,
            executeSafeTxAction,
            compV3RemoveAllowanceAction,
        ]);
        const functionData = recipe.encodeForDsProxyCall()[1];
        await executeAction('RecipeExecutor', functionData, proxy);
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
        await redeploy('ExecuteSafeTx');

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

        await executeMigrationInOneTx(positionData);

        await validateMigration(positionData, proxyLoanBefore);
    });
});
