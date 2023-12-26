const { expect } = require('chai');
const hre = require('hardhat');
const dfs = require('@defisaver/sdk');
const {
    getProxy,
    WETH_ADDRESS,
    LUSD_ADDR,
    takeSnapshot,
    revertToSnapshot,
    setBalance,
    addrs,
    getNetwork,
    redeploy,
    nullAddress,
    formatExchangeObj,
    UNISWAP_WRAPPER,
    getAddrFromRegistry,
} = require('../../utils');

const { aaveV3Supply, aaveV3Borrow, executeAction } = require('../../actions');

const {
    VARIABLE_RATE,
    AAVE_NO_DEBT_MODE,
    WETH_ASSET_ID_IN_AAVE_V3_MARKET,
    LUSD_ASSET_ID_IN_AAVE_V3_MARKET,
} = require('../../utils-aave');

const aaveV3BoostWithNewFL = async () => {
    describe('Aave V3 AaveV3 Boost Tests With Carry Debt FL', () => {
        let senderAcc;
        let senderAddr;
        let proxy;
        let proxyAddr;
        let snapshotId;
        let flAaveV3Address;
        let flAaveV3CarryDebtAddress;
        let aaveV3View;

        const createAaveV3Position = async (collAmount, debtAmount) => {
            const collAddress = WETH_ADDRESS;
            await setBalance(collAddress, senderAddr, collAmount);
            await aaveV3Supply(
                proxy,
                addrs[getNetwork()].AAVE_MARKET,
                collAmount,
                collAddress,
                WETH_ASSET_ID_IN_AAVE_V3_MARKET,
                senderAddr,
                senderAcc,
            );
            await aaveV3Borrow(
                proxy,
                addrs[getNetwork()].AAVE_MARKET,
                debtAmount,
                senderAddr,
                VARIABLE_RATE,
                LUSD_ASSET_ID_IN_AAVE_V3_MARKET,
            );
        };

        const actions = {
            flAaveV3Action: (boostAmount) => new dfs.actions.flashloan.AaveV3FlashLoanNoFeeAction(
                [LUSD_ADDR],
                [boostAmount.toString()],
                [AAVE_NO_DEBT_MODE],
                nullAddress,
            ),
            flAaveV3CarryDebtAction: (boostAmount) => new dfs.actions.flashloan
                .AaveV3FlashLoanCarryDebtAction(
                    [LUSD_ADDR],
                    [boostAmount.toString()],
                    [VARIABLE_RATE],
                    proxyAddr,
                ),
            sellAction: (boostAmount) => new dfs.actions.basic.SellAction(
                formatExchangeObj(
                    LUSD_ADDR, // debt address
                    WETH_ADDRESS, // collateral
                    boostAmount.toString(), //  boostAmount
                    UNISWAP_WRAPPER,
                ),
                proxyAddr, // from
                proxyAddr, // to
            ),
            feeTakingAction: (gasCost) => new dfs.actions.basic.GasFeeAction(
                gasCost,
                WETH_ADDRESS,
                '$2', // piped from sell action
            ),
            aaveV3SupplyAction: () => new dfs.actions.aaveV3.AaveV3SupplyAction(
                true, // use default market
                addrs[getNetwork()].AAVE_MARKET,
                '$3', // pipe from fee taking action
                proxyAddr,
                WETH_ADDRESS,
                WETH_ASSET_ID_IN_AAVE_V3_MARKET,
                true, // use as collateral
                false, // use on behalf of
                nullAddress, // on behalf of
            ),
            aaveV3BorrowAction: () => new dfs.actions.aaveV3.AaveV3BorrowAction(
                true,
                addrs[getNetwork()].AAVE_MARKET,
                '$1', // fl amount
                flAaveV3Address,
                VARIABLE_RATE,
                LUSD_ASSET_ID_IN_AAVE_V3_MARKET,
                false,
                nullAddress,
            ),
            delegateCreditOnAaveV3Action: (amount) => new dfs.actions.aaveV3.AaveV3DelegateCredit(
                true,
                addrs[getNetwork()].AAVE_MARKET,
                amount,
                VARIABLE_RATE,
                LUSD_ASSET_ID_IN_AAVE_V3_MARKET,
                flAaveV3CarryDebtAddress,
            ),
        };

        before(async () => {
            flAaveV3Address = await getAddrFromRegistry('FLAaveV3');

            aaveV3View = await redeploy('AaveV3View');

            const flAaveV3CarryDebtContract = await redeploy('FLAaveV3CarryDebt');
            flAaveV3CarryDebtAddress = flAaveV3CarryDebtContract.address;

            await redeploy('AaveV3DelegateCredit');

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAddr);
            proxyAddr = proxy.address;
        });

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        it('... should perform aaveV3 boost standard way', async () => {
            const collAmount = hre.ethers.utils.parseUnits('100', 18);
            const debtAmount = hre.ethers.utils.parseUnits('100000', 18);

            await createAaveV3Position(collAmount, debtAmount);

            const loanDataBeforeBoost = await aaveV3View.getLoanData(
                addrs[getNetwork()].AAVE_MARKET, proxyAddr,
            );

            const boostAmount = debtAmount.div(20);

            const regularBoostRecipe = new dfs.Recipe('RegularAaveV3BoostRecipe', [
                actions.flAaveV3Action(boostAmount),
                actions.sellAction(boostAmount),
                actions.feeTakingAction(1_400_000),
                actions.aaveV3SupplyAction(),
                actions.aaveV3BorrowAction(),
            ]);

            const functionData = regularBoostRecipe.encodeForDsProxyCall();
            await executeAction('RecipeExecutor', functionData[1], proxy);

            const loanDataAfterBoost = await aaveV3View.getLoanData(
                addrs[getNetwork()].AAVE_MARKET, proxy.address,
            );
            console.log(`Ratio before: ${loanDataBeforeBoost.ratio / 1e16}`);
            console.log(`Ratio After: ${loanDataAfterBoost.ratio / 1e16}`);
            expect(loanDataAfterBoost.ratio).to.be.lt(loanDataBeforeBoost.ratio);
        }).timeout(300000);

        it('... should perform aaveV3 boost with carry debt fl', async () => {
            const collAmount = hre.ethers.utils.parseUnits('100', 18);
            const debtAmount = hre.ethers.utils.parseUnits('100000', 18);

            await createAaveV3Position(collAmount, debtAmount);

            const loanDataBeforeBoost = await aaveV3View.getLoanData(
                addrs[getNetwork()].AAVE_MARKET, proxy.address,
            );

            const boostAmount = debtAmount.div(20);

            const regularBoostRecipe = new dfs.Recipe('AaveV3BoostRecipeWithNewFL', [
                actions.flAaveV3CarryDebtAction(boostAmount),
                actions.sellAction(boostAmount),
                actions.feeTakingAction(1_400_000),
                actions.aaveV3SupplyAction(),
                actions.delegateCreditOnAaveV3Action('$1'), // amount from FL action
            ]);

            const functionData = regularBoostRecipe.encodeForDsProxyCall();
            await executeAction('RecipeExecutor', functionData[1], proxy);

            const loanDataAfterBoost = await aaveV3View.getLoanData(
                addrs[getNetwork()].AAVE_MARKET, proxy.address,
            );
            console.log(`Ratio before: ${loanDataBeforeBoost.ratio / 1e16}`);
            console.log(`Ratio After: ${loanDataAfterBoost.ratio / 1e16}`);
            expect(loanDataAfterBoost.ratio).to.be.lt(loanDataBeforeBoost.ratio);
        }).timeout(300000);

        it('... should revert on carry debt fl when using maximum credit delegation allowance', async () => {
            const collAmount = hre.ethers.utils.parseUnits('100', 18);
            const debtAmount = hre.ethers.utils.parseUnits('100000', 18);

            await createAaveV3Position(collAmount, debtAmount);

            const boostAmount = debtAmount.div(20);

            const regularBoostRecipe = new dfs.Recipe('AaveV3BoostRecipeWithNewFL', [
                actions.flAaveV3CarryDebtAction(boostAmount),
                actions.sellAction(boostAmount),
                actions.feeTakingAction(1_400_000),
                actions.aaveV3SupplyAction(),
                actions.delegateCreditOnAaveV3Action(hre.ethers.constants.MaxUint256),
            ]);

            const functionData = regularBoostRecipe.encodeForDsProxyCall();
            await expect(executeAction('RecipeExecutor', functionData[1], proxy)).to.be.reverted;
        }).timeout(300000);

        it('... should revert on carry debt fl when using slightly bigger credit delegation allowance', async () => {
            const collAmount = hre.ethers.utils.parseUnits('100', 18);
            const debtAmount = hre.ethers.utils.parseUnits('100000', 18);

            await createAaveV3Position(collAmount, debtAmount);

            const boostAmount = debtAmount.div(20);

            const regularBoostRecipe = new dfs.Recipe('AaveV3BoostRecipeWithNewFL', [
                actions.flAaveV3CarryDebtAction(boostAmount),
                actions.sellAction(boostAmount),
                actions.feeTakingAction(1_400_000),
                actions.aaveV3SupplyAction(),
                actions.delegateCreditOnAaveV3Action(debtAmount.div(20).add(1)),
            ]);

            const functionData = regularBoostRecipe.encodeForDsProxyCall();
            await expect(executeAction('RecipeExecutor', functionData[1], proxy)).to.be.reverted;
        }).timeout(300000);
    });
};

describe('AaveV3 Boost Tests With Carry Debt FL', function () {
    this.timeout(300000);

    it('... test AaveV3 Boost', async () => {
        await aaveV3BoostWithNewFL();
    }).timeout(300000);
});
