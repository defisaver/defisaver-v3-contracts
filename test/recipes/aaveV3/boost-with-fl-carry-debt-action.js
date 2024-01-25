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
    approve,
    WALLETS,
    isWalletNameDsProxy,
} = require('../../utils');

const { executeAction } = require('../../actions');

const {
    VARIABLE_RATE,
    AAVE_NO_DEBT_MODE,
    WETH_ASSET_ID_IN_AAVE_V3_MARKET,
    LUSD_ASSET_ID_IN_AAVE_V3_MARKET,
} = require('../../utils-aave');

const aaveV3BoostWithNewFL = async () => {
    describe('Aave V3 AaveV3 Boost Tests With Carry Debt FL', () => {
        let snapshotId;

        let senderAcc;
        let senderAddr;
        let proxy;
        let safe;
        let wallet;

        let flActionAddress;
        let flAaveV3CarryDebtAddress;
        let aaveV3View;

        const determineActiveWallet = (w) => { wallet = isWalletNameDsProxy(w) ? proxy : safe; };

        const createAaveV3Position = async (collAmount, debtAmount) => {
            const collAddress = WETH_ADDRESS;
            await setBalance(collAddress, senderAddr, collAmount);
            await approve(collAddress, wallet.address, senderAcc);

            const recipe = new dfs.Recipe('CreateAaveV3Position', [
                new dfs.actions.aaveV3.AaveV3SupplyAction(
                    true,
                    addrs[getNetwork()].AAVE_MARKET,
                    collAmount.toString(),
                    senderAddr,
                    collAddress,
                    WETH_ASSET_ID_IN_AAVE_V3_MARKET,
                    true,
                    false,
                    nullAddress,
                ),
                new dfs.actions.aaveV3.AaveV3BorrowAction(
                    true,
                    addrs[getNetwork()].AAVE_MARKET,
                    debtAmount.toString(),
                    senderAddr,
                    VARIABLE_RATE,
                    LUSD_ASSET_ID_IN_AAVE_V3_MARKET,
                    true,
                    nullAddress,
                ),
            ]);
            const functionData = recipe.encodeForDsProxyCall();
            await executeAction('RecipeExecutor', functionData[1], wallet);
        };

        const actions = {
            flAaveV3Action: (boostAmount) => new dfs.actions.flashloan.FLAction(
                new dfs.actions.flashloan.AaveV3FlashLoanAction(
                    [LUSD_ADDR],
                    [boostAmount.toString()],
                    [AAVE_NO_DEBT_MODE],
                    nullAddress,
                ),
            ),
            flAaveV3CarryDebtAction: (boostAmount) => new dfs.actions.flashloan
                .AaveV3FlashLoanCarryDebtAction(
                    [LUSD_ADDR],
                    [boostAmount.toString()],
                    [VARIABLE_RATE],
                    wallet.address,
                ),
            sellAction: (boostAmount) => new dfs.actions.basic.SellAction(
                formatExchangeObj(
                    LUSD_ADDR, // debt address
                    WETH_ADDRESS, // collateral
                    boostAmount.toString(), //  boostAmount
                    UNISWAP_WRAPPER,
                ),
                wallet.address, // from
                wallet.address, // to
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
                wallet.address,
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
                flActionAddress,
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
            const flActionContract = await redeploy('FLAction');
            flActionAddress = flActionContract.address;

            const flAaveV3CarryDebtContract = await redeploy('FLAaveV3CarryDebt');
            flAaveV3CarryDebtAddress = flAaveV3CarryDebtContract.address;

            aaveV3View = await redeploy('AaveV3View');
            await redeploy('RecipeExecutor');
            await redeploy('DFSSell');
            await redeploy('GasFeeTaker');
            await redeploy('AaveV3Supply');
            await redeploy('AaveV3Borrow');
            await redeploy('AaveV3DelegateCredit');

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAddr);
            safe = await getProxy(senderAddr, true);
        });

        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        for (let i = 0; i < WALLETS.length; ++i) {
            it(`... should perform aaveV3 boost standard way using ${WALLETS[i]} as wallet`, async () => {
                determineActiveWallet(WALLETS[i]);
                const collAmount = hre.ethers.utils.parseUnits('100', 18);
                const debtAmount = hre.ethers.utils.parseUnits('100000', 18);

                await createAaveV3Position(collAmount, debtAmount);

                const loanDataBeforeBoost = await aaveV3View.getLoanData(
                    addrs[getNetwork()].AAVE_MARKET, wallet.address,
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
                await executeAction('RecipeExecutor', functionData[1], wallet);

                const loanDataAfterBoost = await aaveV3View.getLoanData(
                    addrs[getNetwork()].AAVE_MARKET, wallet.address,
                );
                console.log(`Ratio before: ${loanDataBeforeBoost.ratio / 1e16}`);
                console.log(`Ratio After: ${loanDataAfterBoost.ratio / 1e16}`);
                expect(loanDataAfterBoost.ratio).to.be.lt(loanDataBeforeBoost.ratio);
            }).timeout(300000);

            it(`... should perform aaveV3 boost with carry debt fl using ${WALLETS[i]} as wallet`, async () => {
                determineActiveWallet(WALLETS[i]);
                const collAmount = hre.ethers.utils.parseUnits('100', 18);
                const debtAmount = hre.ethers.utils.parseUnits('100000', 18);

                await createAaveV3Position(collAmount, debtAmount);

                const loanDataBeforeBoost = await aaveV3View.getLoanData(
                    addrs[getNetwork()].AAVE_MARKET, wallet.address,
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
                await executeAction('RecipeExecutor', functionData[1], wallet);

                const loanDataAfterBoost = await aaveV3View.getLoanData(
                    addrs[getNetwork()].AAVE_MARKET, wallet.address,
                );
                console.log(`Ratio before: ${loanDataBeforeBoost.ratio / 1e16}`);
                console.log(`Ratio After: ${loanDataAfterBoost.ratio / 1e16}`);
                expect(loanDataAfterBoost.ratio).to.be.lt(loanDataBeforeBoost.ratio);
            }).timeout(300000);

            it(`... should revert on carry debt fl when using maximum credit delegation allowance using ${WALLETS[i]} as wallet`, async () => {
                determineActiveWallet(WALLETS[i]);
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
                await expect(executeAction('RecipeExecutor', functionData[1], wallet)).to.be.reverted;
            }).timeout(300000);

            it(`... should revert on carry debt fl when using slightly bigger credit delegation allowance and using ${WALLETS[i]} as wallet`, async () => {
                determineActiveWallet(WALLETS[i]);
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
                await expect(executeAction('RecipeExecutor', functionData[1], wallet)).to.be.reverted;
            }).timeout(300000);
        }
    });
};

describe('AaveV3 Boost Tests With Carry Debt FL', function () {
    this.timeout(300000);

    it('... test AaveV3 Boost', async () => {
        await aaveV3BoostWithNewFL();
    }).timeout(300000);
});
