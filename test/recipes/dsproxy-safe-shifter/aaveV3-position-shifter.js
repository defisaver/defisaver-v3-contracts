const { ethers } = require('hardhat');
const { expect } = require('chai');
const dfs = require('@defisaver/sdk');
const {
    getProxy,
    redeploy,
    addrs,
    getNetwork,
    WETH_ADDRESS,
    LUSD_ADDR,
    setBalance,
    nullAddress,
} = require('../../utils');
const { aaveV3Supply, aaveV3Borrow, proxyApproveToken } = require('../../actions');

const {
    VARIABLE_RATE,
    WETH_ASSET_ID_IN_AAVE_V3_MARKET,
    LUSD_ASSET_ID_IN_AAVE_V3_MARKET,
    AAVE_NO_DEBT_MODE,
    A_WETH_ADDRESS_V3,
} = require('../../utils-aave');
const { executeSafeTx } = require('../../utils-safe');

describe('Safe-AaveV3-Shift-Position', function () {
    this.timeout(200000);

    let senderAcc;
    let proxy;
    let safe;
    let aaveV3View;
    let flAction;
    let recipeExecutor;

    const createAaveV3Position = async (positionObj) => {
        await setBalance(positionObj.collAddr, senderAcc.address, positionObj.collAmount);
        await aaveV3Supply(
            proxy,
            addrs[getNetwork()].AAVE_MARKET,
            positionObj.collAmount,
            positionObj.collAddr,
            positionObj.collAssetId,
            senderAcc.address,
            senderAcc,
        );
        await aaveV3Borrow(
            proxy,
            addrs[getNetwork()].AAVE_MARKET,
            positionObj.debtAmount,
            senderAcc.address,
            VARIABLE_RATE,
            positionObj.debtAssetId,
        );
    };

    const createShiftRecipe = async (positionObj) => {
        const debtAmount = positionObj.debtAmount.mul(1_00_01).div(1_00_00);

        const flashloanAction = new dfs.actions.flashloan.FLAction(
            new dfs.actions.flashloan.AaveV3FlashLoanAction(
                [positionObj.debtAddr],
                [debtAmount],
                [AAVE_NO_DEBT_MODE],
                nullAddress,
            ),
        );
        const paybackAction = new dfs.actions.aaveV3.AaveV3PaybackAction(
            true,
            addrs[getNetwork()].AAVE_MARKET,
            ethers.constants.MaxUint256, // repay hole debt
            safe.address,
            VARIABLE_RATE,
            positionObj.debtAddr,
            positionObj.debtAssetId,
            true,
            proxy.address, // we are paying back debt for ds PROXY
        );
        // for this action we need previous ds proxy approval
        const pullCollateralATokensAction = new dfs.actions.basic.PullTokenAction(
            positionObj.collATokenAddr,
            proxy.address,
            ethers.constants.MaxUint256,
        );
        const borrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
            true,
            addrs[getNetwork()].AAVE_MARKET,
            '$1', // fl amount
            flAction.address, // return fl amount to FLAction
            VARIABLE_RATE,
            positionObj.debtAssetId,
            false,
            nullAddress,
        );
        return new dfs.Recipe('ShiftAaveV3PositionToSafe', [
            flashloanAction,
            paybackAction,
            pullCollateralATokensAction,
            borrowAction,
        ]);
    };

    before(async () => {
        aaveV3View = await redeploy('AaveV3View');
        flAction = await redeploy('FLAction');
        recipeExecutor = await redeploy('RecipeExecutor');
        await redeploy('PullToken');
        await redeploy('AaveV3Borrow');
        await redeploy('AaveV3Payback');
        await redeploy('ApproveToken');

        senderAcc = (await ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address, false);
        safe = await getProxy(senderAcc.address, true);
    });

    it('... should shift aave V3 position from dsProxy to safe', async () => {
        const positionObj = {
            collAddr: WETH_ADDRESS,
            collAmount: ethers.utils.parseUnits('10', 18),
            collAssetId: WETH_ASSET_ID_IN_AAVE_V3_MARKET,
            collATokenAddr: A_WETH_ADDRESS_V3,
            debtAddr: LUSD_ADDR,
            debtAmount: ethers.utils.parseUnits('10000', 18),
            debtAssetId: LUSD_ASSET_ID_IN_AAVE_V3_MARKET,
        };
        await createAaveV3Position(positionObj);

        // accrue interest
        const aCollTokensAmount = positionObj.collAmount.mul(1_00_01).div(1_00_00);

        // dsProxy approve safe to pull aCollTokens
        await proxyApproveToken(
            proxy,
            positionObj.collATokenAddr,
            safe.address,
            aCollTokensAmount,
        );
        console.log('Getting loan data for dsProxy before shift...');
        const proxyLoanBefore = await aaveV3View.getLoanData(
            addrs[getNetwork()].AAVE_MARKET,
            proxy.address,
        );

        const shiftPositionRecipe = await createShiftRecipe(positionObj);
        const recipeData = shiftPositionRecipe.encodeForDsProxyCall()[1];

        await executeSafeTx(
            senderAcc.address,
            safe,
            recipeExecutor.address,
            recipeData,
        );

        const proxyLoanAfter = await aaveV3View.getLoanData(
            addrs[getNetwork()].AAVE_MARKET,
            proxy.address,
        );
        const safeLoanAfter = await aaveV3View.getLoanData(
            addrs[getNetwork()].AAVE_MARKET,
            safe.address,
        );

        const collAddrProxyAfter = proxyLoanAfter.collAddr.filter((a) => a !== nullAddress);
        const borrowAddrProxyAfter = proxyLoanAfter.borrowAddr.filter((a) => a !== nullAddress);
        expect(proxyLoanAfter.ratio).to.be.equal(ethers.BigNumber.from(0));
        expect(collAddrProxyAfter.length).to.be.equal(0);
        expect(borrowAddrProxyAfter.length).to.be.equal(0);

        const collAddrSafeAfter = safeLoanAfter.collAddr.filter((a) => a !== nullAddress);
        expect(collAddrSafeAfter.length).to.be.equal(1);
        expect(collAddrSafeAfter[0]).to.be.equal(positionObj.collAddr);

        const borrowAddrSafeAfter = safeLoanAfter.borrowAddr.filter((a) => a !== nullAddress);
        expect(borrowAddrSafeAfter.length).to.be.equal(1);
        expect(borrowAddrSafeAfter[0]).to.be.equal(positionObj.debtAddr);

        const collAmountProxyBefore = proxyLoanBefore.collAmounts[0];
        const collAmountSafeAfter = safeLoanAfter.collAmounts[0];
        expect(collAmountSafeAfter).to.be.gte(collAmountProxyBefore);

        const borrowAmountProxyBefore = proxyLoanBefore.borrowVariableAmounts[0];
        const borrowAmountSafeAfter = safeLoanAfter.borrowVariableAmounts[0];
        expect(borrowAmountSafeAfter).to.be.gte(borrowAmountProxyBefore);

        const ratioDiff = proxyLoanBefore.ratio.sub(safeLoanAfter.ratio).abs();
        expect(ratioDiff).to.be.lte(ethers.BigNumber.from('10000000000000000')); // 10e16
    });
});
