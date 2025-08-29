/* eslint-disable no-await-in-loop */
const hre = require("hardhat");
const { expect } = require("chai");
const dfs = require("@defisaver/sdk");
const { getAssetInfo } = require("@defisaver/tokens");
const {
    takeSnapshot,
    revertToSnapshot,
    getProxy,
    redeploy,
    setNewExchangeWrapper,
    network,
    isNetworkFork,
    getOwnerAddr,
    chainIds,
    formatMockExchangeObjUsdFeed,
    fetchAmountInUSDPrice,
    getContractFromRegistry,
    balanceOf,
} = require("../../utils/utils");
const {
    getFluidVaultT4TestPairs,
    openFluidT4Vault,
    MAX_DEBT_SHARES_TO_MINT,
    MIN_DEPOSIT_SHARES_TO_MINT,
    MAX_DEPOSIT_SHARES_TO_BURN,
    MIN_DEBT_SHARES_TO_BURN,
    MIN_COLLATERAL_TO_WITHDRAW,
} = require("../../utils/fluid");
const { executeAction } = require("../../utils/actions");
const { topUp } = require("../../../scripts/utils/fork");

describe("Fluid-Dex-T4-Recipes", function () {
    this.timeout(80000);

    const testPairs = getFluidVaultT4TestPairs();

    let senderAcc;
    let proxy;
    let view;
    let flActionContract;
    let mockWrapper;
    let isFork;
    let snapshot;

    // fork block : 22182967
    before(async () => {
        isFork = isNetworkFork();
        senderAcc = (await hre.ethers.getSigners())[0];

        if (isFork) {
            await topUp(senderAcc.address);
            await topUp(getOwnerAddr());
        }

        proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);

        await redeploy("FluidDexOpen", isFork);
        await redeploy("FluidDexBorrow", isFork);
        await redeploy("FluidDexSupply", isFork);
        await redeploy("FluidDexPayback", isFork);
        await redeploy("FluidDexWithdraw", isFork);
        view = await redeploy("FluidView", isFork);

        mockWrapper = await redeploy(
            network === "mainnet" ? "MockExchangeWrapperUsdFeed" : "MockExchangeWrapperUsdFeedL2",
            isFork
        );
        await setNewExchangeWrapper(senderAcc, mockWrapper.address, isFork);

        flActionContract = await getContractFromRegistry("FLAction", isFork);
    });
    beforeEach(async () => {
        snapshot = await takeSnapshot();
    });
    afterEach(async () => {
        await revertToSnapshot(snapshot);
    });

    for (let i = 0; i < testPairs.length; i++) {
        const vault = testPairs[i].vault;
        const weth = getAssetInfo("WETH", chainIds[network]);
        const collToken0 = getAssetInfo(testPairs[i].collSymbol0, chainIds[network]);
        const collToken1 = getAssetInfo(testPairs[i].collSymbol1, chainIds[network]);
        const debtToken0 = getAssetInfo(testPairs[i].debtSymbol0, chainIds[network]);
        const debtToken1 = getAssetInfo(testPairs[i].debtSymbol1, chainIds[network]);

        it(`should do a boost for Fluid T4 Dex Position ${collToken0.symbol}-${collToken1.symbol}/${debtToken0.symbol}-${debtToken1.symbol} position`, async () => {
            const collAmount0InUSD = 40000;
            const collAmount1InUSD = 0;
            const borrowAmount0InUSD = 15000;
            const borrowAmount1InUSD = 0;

            const boostAmount = await fetchAmountInUSDPrice(
                debtToken0.symbol === "ETH" ? "WETH" : debtToken0.symbol,
                borrowAmount0InUSD / 5
            );

            const nftId = await openFluidT4Vault(
                proxy,
                senderAcc,
                vault,
                collAmount0InUSD,
                collAmount1InUSD,
                borrowAmount0InUSD,
                borrowAmount1InUSD,
                isFork
            );

            if (nftId === 0) {
                console.log(
                    `Failed to open position on fluid vault t4: ${collToken0.symbol}-${collToken1.symbol}/${debtToken0.symbol}-${debtToken1.symbol}. Skipping test...`
                );
                return;
            }

            const ratioBefore = await view.getRatio(nftId);

            console.log("Created Fluid T4 vault with ID:", nftId.toString());
            console.log("Ratio before boost:", ratioBefore.toString());

            const borrowAction = new dfs.actions.fluid.FluidDexSmartDebtBorrowAction(
                vault,
                proxy.address,
                nftId,
                [boostAmount, 0, MAX_DEBT_SHARES_TO_MINT],
                true
            );
            const sellAction = new dfs.actions.basic.SellAction(
                await formatMockExchangeObjUsdFeed(
                    debtToken0,
                    collToken0.symbol === "ETH" ? weth : collToken0,
                    boostAmount,
                    mockWrapper
                ),
                proxy.address,
                proxy.address
            );
            const supplyAction = new dfs.actions.fluid.FluidDexSmartCollSupplyAction(
                vault,
                proxy.address,
                nftId,
                ["$2", 0, MIN_DEPOSIT_SHARES_TO_MINT]
            );
            const boostRecipe = new dfs.Recipe("BoostRecipe", [
                borrowAction,
                sellAction,
                supplyAction,
            ]);

            const functionData = boostRecipe.encodeForDsProxyCall();
            await executeAction("RecipeExecutor", functionData[1], proxy);
            const ratioAfter = await view.getRatio(nftId);
            console.log("Ratio after boost:", ratioAfter.toString());
            expect(ratioAfter).to.be.lt(ratioBefore);
        });

        it(`should do a FL boost for Fluid T4 Dex Position ${collToken0.symbol}-${collToken1.symbol}/${debtToken0.symbol}-${debtToken1.symbol} position`, async () => {
            const collAmount0InUSD = 40000;
            const collAmount1InUSD = 0;
            const borrowAmount0InUSD = 15000;
            const borrowAmount1InUSD = 0;

            const boostAmount = await fetchAmountInUSDPrice(
                debtToken0.symbol === "ETH" ? "WETH" : debtToken0.symbol,
                borrowAmount0InUSD / 5
            );

            const nftId = await openFluidT4Vault(
                proxy,
                senderAcc,
                vault,
                collAmount0InUSD,
                collAmount1InUSD,
                borrowAmount0InUSD,
                borrowAmount1InUSD,
                isFork
            );

            if (nftId === 0) {
                console.log(
                    `Failed to open position on fluid vault t4: ${collToken0.symbol}-${collToken1.symbol}/${debtToken0.symbol}-${debtToken1.symbol}. Skipping test...`
                );
                return;
            }

            const ratioBefore = await view.getRatio(nftId);

            console.log("Created Fluid T4 vault with ID:", nftId.toString());
            console.log("Ratio before boost:", ratioBefore.toString());

            const debtToken = debtToken0.symbol === "ETH" ? weth : debtToken0;

            const flAction = new dfs.actions.flashloan.FLAction(
                new dfs.actions.flashloan.BalancerFlashLoanAction(
                    [debtToken.address],
                    [boostAmount]
                )
            );
            const sellAction = new dfs.actions.basic.SellAction(
                await formatMockExchangeObjUsdFeed(
                    debtToken,
                    collToken0.symbol === "ETH" ? weth : collToken0,
                    boostAmount,
                    mockWrapper
                ),
                proxy.address,
                proxy.address
            );
            const supplyAction = new dfs.actions.fluid.FluidDexSmartCollSupplyAction(
                vault,
                proxy.address,
                nftId,
                ["$2", 0, MIN_DEPOSIT_SHARES_TO_MINT]
            );
            const borrowAction = new dfs.actions.fluid.FluidDexSmartDebtBorrowAction(
                vault,
                flActionContract.address,
                nftId,
                [boostAmount, 0, MAX_DEBT_SHARES_TO_MINT],
                true
            );
            const boostRecipe = new dfs.Recipe("FlBoostRecipe", [
                flAction,
                sellAction,
                supplyAction,
                borrowAction,
            ]);

            const functionData = boostRecipe.encodeForDsProxyCall();
            await executeAction("RecipeExecutor", functionData[1], proxy);
            const ratioAfter = await view.getRatio(nftId);
            console.log("Ratio after fl boost:", ratioAfter.toString());
            expect(ratioAfter).to.be.lt(ratioBefore);
        });

        it(`should do a repay for Fluid T4 Dex Position ${collToken0.symbol}-${collToken1.symbol}/${debtToken0.symbol}-${debtToken1.symbol} position`, async () => {
            const collAmount0InUSD = 40000;
            const collAmount1InUSD = 0;
            const borrowAmount0InUSD = 15000;
            const borrowAmount1InUSD = 0;

            const repayAmount = await fetchAmountInUSDPrice(
                collToken0.symbol === "ETH" ? "WETH" : collToken0.symbol,
                collAmount0InUSD / 10
            );

            const nftId = await openFluidT4Vault(
                proxy,
                senderAcc,
                vault,
                collAmount0InUSD,
                collAmount1InUSD,
                borrowAmount0InUSD,
                borrowAmount1InUSD,
                isFork
            );

            if (nftId === 0) {
                console.log(
                    `Failed to open position on fluid vault t4: ${collToken0.symbol}-${collToken1.symbol}/${debtToken0.symbol}-${debtToken1.symbol}. Skipping test...`
                );
                return;
            }

            const ratioBefore = await view.getRatio(nftId);

            console.log("Created Fluid T4 vault with ID:", nftId.toString());
            console.log("Ratio before repay:", ratioBefore.toString());

            const withdrawAction = new dfs.actions.fluid.FluidDexSmartCollWithdrawAction(
                vault,
                proxy.address,
                nftId,
                [repayAmount, 0, MAX_DEPOSIT_SHARES_TO_BURN, 0],
                true
            );
            const sellAction = new dfs.actions.basic.SellAction(
                await formatMockExchangeObjUsdFeed(
                    collToken0.symbol === "ETH" ? weth : collToken0,
                    debtToken0.symbol === "ETH" ? weth : debtToken0,
                    repayAmount,
                    mockWrapper
                ),
                proxy.address,
                proxy.address
            );
            const paybackAction = new dfs.actions.fluid.FluidDexSmartDebtPaybackAction(
                vault,
                proxy.address,
                nftId,
                ["$2", 0, MIN_DEBT_SHARES_TO_BURN, 0]
            );
            const repayRecipe = new dfs.Recipe("RepayRecipe", [
                withdrawAction,
                sellAction,
                paybackAction,
            ]);

            const functionData = repayRecipe.encodeForDsProxyCall();
            await executeAction("RecipeExecutor", functionData[1], proxy);
            const ratioAfter = await view.getRatio(nftId);
            console.log("Ratio after repay:", ratioAfter.toString());
            expect(ratioAfter).to.be.gt(ratioBefore);
        });

        it(`should do a FL repay for Fluid T4 Dex Position ${collToken0.symbol}-${collToken1.symbol}/${debtToken0.symbol}-${debtToken1.symbol} position`, async () => {
            const collAmount0InUSD = 40000;
            const collAmount1InUSD = 0;
            const borrowAmount0InUSD = 15000;
            const borrowAmount1InUSD = 0;

            const repayAmount = await fetchAmountInUSDPrice(
                collToken0.symbol === "ETH" ? "WETH" : collToken0.symbol,
                collAmount0InUSD / 10
            );

            const nftId = await openFluidT4Vault(
                proxy,
                senderAcc,
                vault,
                collAmount0InUSD,
                collAmount1InUSD,
                borrowAmount0InUSD,
                borrowAmount1InUSD,
                isFork
            );

            if (nftId === 0) {
                console.log(
                    `Failed to open position on fluid vault t4: ${collToken0.symbol}-${collToken1.symbol}/${debtToken0.symbol}-${debtToken1.symbol}. Skipping test...`
                );
                return;
            }

            const ratioBefore = await view.getRatio(nftId);

            console.log("Created Fluid T4 vault with ID:", nftId.toString());
            console.log("Ratio before FL repay:", ratioBefore.toString());

            const collToken = collToken0.symbol === "ETH" ? weth : collToken0;

            const flAction = new dfs.actions.flashloan.FLAction(
                new dfs.actions.flashloan.BalancerFlashLoanAction(
                    [collToken.address],
                    [repayAmount]
                )
            );
            const sellAction = new dfs.actions.basic.SellAction(
                await formatMockExchangeObjUsdFeed(
                    collToken,
                    debtToken0.symbol === "ETH" ? weth : debtToken0,
                    repayAmount,
                    mockWrapper
                ),
                proxy.address,
                proxy.address
            );
            const paybackAction = new dfs.actions.fluid.FluidDexSmartDebtPaybackAction(
                vault,
                proxy.address,
                nftId,
                ["$2", 0, MIN_DEBT_SHARES_TO_BURN, 0]
            );
            const withdrawAction = new dfs.actions.fluid.FluidDexSmartCollWithdrawAction(
                vault,
                flActionContract.address,
                nftId,
                [repayAmount, 0, MAX_DEPOSIT_SHARES_TO_BURN, 0],
                true
            );
            const flRepayRecipe = new dfs.Recipe("FlRepayRecipe", [
                flAction,
                sellAction,
                paybackAction,
                withdrawAction,
            ]);

            const functionData = flRepayRecipe.encodeForDsProxyCall();
            await executeAction("RecipeExecutor", functionData[1], proxy);
            const ratioAfter = await view.getRatio(nftId);
            console.log("Ratio after FL repay:", ratioAfter.toString());
            expect(ratioAfter).to.be.gt(ratioBefore);
        });

        it(`should perform fl close for Fluid T4 Dex Position ${collToken0.symbol}-${collToken1.symbol}/${debtToken0.symbol}-${debtToken1.symbol} position`, async () => {
            const collAmount0InUSD = 40000;
            const collAmount1InUSD = 0;
            const borrowAmount0InUSD = 15000;
            const borrowAmount1InUSD = 0;

            const nftId = await openFluidT4Vault(
                proxy,
                senderAcc,
                vault,
                collAmount0InUSD,
                collAmount1InUSD,
                borrowAmount0InUSD,
                borrowAmount1InUSD,
                isFork
            );

            if (nftId === 0) {
                console.log(
                    `Failed to open position on fluid vault t4: ${collToken0.symbol}-${collToken1.symbol}/${debtToken0.symbol}-${debtToken1.symbol}. Skipping test...`
                );
                return;
            }

            console.log("Created Fluid T4 vault with ID:", nftId.toString());

            const debtToken = debtToken0.symbol === "ETH" ? weth : debtToken0;
            const collToken = collToken0.symbol === "ETH" ? weth : collToken0;

            // take snapshot of proxy balances before the close
            const proxyBalanceBeforeDebtToken = await balanceOf(debtToken.address, proxy.address);
            const proxyBalanceBeforeCollToken = await balanceOf(collToken.address, proxy.address);

            // should be called from view contract, but here we are simplifying the test
            const fullEstimatedDebtAmount = await fetchAmountInUSDPrice(
                debtToken.symbol,
                borrowAmount0InUSD + borrowAmount1InUSD + 500 // add some buffer
            );

            // only used to mock exchange values
            const fullEstimatedWithdrawAmount = await fetchAmountInUSDPrice(
                collToken.symbol,
                collAmount0InUSD + collAmount1InUSD + 500 // add some buffer
            );

            const flAction = new dfs.actions.flashloan.FLAction(
                new dfs.actions.flashloan.BalancerFlashLoanAction(
                    [debtToken.address],
                    [fullEstimatedDebtAmount]
                )
            );
            const paybackAction = new dfs.actions.fluid.FluidDexSmartDebtPaybackAction(
                vault,
                proxy.address,
                nftId,
                [
                    hre.ethers.constants.MaxUint256, // max payback in debt token 0
                    0, // debt amount 1 to payback
                    0, // min debt shares to burn, ignored for max payback
                    fullEstimatedDebtAmount,
                ],
                true
            );
            const withdrawAction = new dfs.actions.fluid.FluidDexSmartCollWithdrawAction(
                vault,
                proxy.address,
                nftId,
                [
                    hre.ethers.constants.MaxUint256, // max withdrawal in coll token 0
                    0, // coll amount 1 to withdraw
                    0, // min debt shares to burn, ignored for max withdrawal
                    MIN_COLLATERAL_TO_WITHDRAW, // Used only for max withdrawal
                ],
                true
            );
            const sellAction = new dfs.actions.basic.SellAction(
                await formatMockExchangeObjUsdFeed(
                    collToken,
                    debtToken,
                    "$3", // full withdrawal in coll token 0
                    mockWrapper,
                    fullEstimatedWithdrawAmount
                ),
                proxy.address,
                proxy.address
            );
            const sendDebtForFlashloan = new dfs.actions.basic.SendTokenAction(
                debtToken.address,
                flActionContract.address,
                "$1"
            );
            const sendDebtDust = new dfs.actions.basic.SendTokenAction(
                debtToken.address,
                senderAcc.address,
                hre.ethers.constants.MaxUint256
            );

            const closeRecipe = new dfs.Recipe("CloseRecipe", [
                flAction,
                paybackAction,
                withdrawAction,
                sellAction,
                sendDebtForFlashloan,
                sendDebtDust,
            ]);

            const functionData = closeRecipe.encodeForDsProxyCall();
            await executeAction("RecipeExecutor", functionData[1], proxy);

            // take snapshot of proxy balances after the close
            const proxyBalanceAfterDebtToken = await balanceOf(debtToken.address, proxy.address);
            const proxyBalanceAfterCollToken = await balanceOf(collToken.address, proxy.address);

            // validate no dust left on proxy
            expect(proxyBalanceAfterDebtToken).to.be.eq(proxyBalanceBeforeDebtToken);
            expect(proxyBalanceAfterCollToken).to.be.eq(proxyBalanceBeforeCollToken);
        });
    }
});
