// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVaultResolver } from "../../../../contracts/interfaces/fluid/resolvers/IFluidVaultResolver.sol";
import { FluidDexPayback } from "../../../../contracts/actions/fluid/dex/FluidDexPayback.sol";
import { FluidView } from "../../../../contracts/views/FluidView.sol";
import { FluidDexOpen } from "../../../../contracts/actions/fluid/dex/FluidDexOpen.sol";
import { FluidDexModel } from "../../../../contracts/actions/fluid/helpers/FluidDexModel.sol";
import { FluidTestBase } from "../FluidTestBase.t.sol";
import { SmartWallet } from "../../../utils/SmartWallet.sol";

contract TestFluidDexPayback is FluidTestBase {
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    FluidDexPayback cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/

    SmartWallet wallet;
    address sender;
    address walletAddr;

    address[] t3Vaults;
    address[] t4Vaults;

    FluidDexOpen openContract;
    FluidView fluidView;

    bool[] t3VaultsSelected;

    struct TestConfig {
        uint256 initialBorrowToken0AmountUSD;
        uint256 initialBorrowToken1AmountUSD;
        uint256 paybackToken0AmountUSD;
        uint256 paybackToken1AmountUSD;
        bool maxPaybackToken0;
        bool maxPaybackToken1;
        bool isDirect;
    }

    struct LocalVars {
        uint256 paybackAmount0;
        uint256 paybackAmount1;
        bool isNativePayback0;
        bool isNativePayback1;
        uint256 senderBorrowToken0BalanceBefore;
        uint256 senderBorrowToken1BalanceBefore;
        uint256 senderEthBalanceBefore;
        uint256 senderBorrowToken0BalanceAfter;
        uint256 senderBorrowToken1BalanceAfter;
        uint256 senderEthBalanceAfter;
        uint256 walletBorrowToken0BalanceBefore;
        uint256 walletBorrowToken1BalanceBefore;
        uint256 walletEthBalanceBefore;
        uint256 walletBorrowToken0BalanceAfter;
        uint256 walletBorrowToken1BalanceAfter;
        uint256 walletEthBalanceAfter;
        IFluidVaultResolver.UserPosition userPositionBefore;
        IFluidVaultResolver.UserPosition userPositionAfter;
        bytes executeActionCallData;
        FluidDexModel.PaybackVariableData paybackVariableData;
        uint256 estimatedSharesToBurn;
        uint256 maxDebtToPull;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("FluidDexPayback");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new FluidDexPayback();
        openContract = new FluidDexOpen();
        fluidView = new FluidView();

        t3Vaults = getT3Vaults();
        t4Vaults = getT4Vaults();

        t3VaultsSelected = new bool[](2);
        t3VaultsSelected[0] = true;
        t3VaultsSelected[1] = false;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/

    function test_partial_payback_in_token_0() public {
        for (uint256 i = 0; i < t3VaultsSelected.length; ++i) {
            _baseTest(
                TestConfig({
                    initialBorrowToken0AmountUSD: 100_000,
                    initialBorrowToken1AmountUSD: 0,
                    paybackToken0AmountUSD: 30_000,
                    paybackToken1AmountUSD: 0,
                    maxPaybackToken0: false,
                    maxPaybackToken1: false,
                    isDirect: false
                }),
                t3VaultsSelected[i]
            );
        }
    }

    function test_partial_payback_in_token_1() public {
        for (uint256 i = 0; i < t3VaultsSelected.length; ++i) {
            _baseTest(
                TestConfig({
                    initialBorrowToken0AmountUSD: 0,
                    initialBorrowToken1AmountUSD: 50_000,
                    paybackToken0AmountUSD: 0,
                    paybackToken1AmountUSD: 30_000,
                    maxPaybackToken0: false,
                    maxPaybackToken1: false,
                    isDirect: false
                }),
                t3VaultsSelected[i]
            );
        }
    }

    function test_partial_payback_in_token_0_more_than_initial_borrow() public {
        for (uint256 i = 0; i < t3VaultsSelected.length; ++i) {
            _baseTest(
                TestConfig({
                    initialBorrowToken0AmountUSD: 20_000,
                    initialBorrowToken1AmountUSD: 50_000,
                    paybackToken0AmountUSD: 60_000,
                    paybackToken1AmountUSD: 0,
                    maxPaybackToken0: false,
                    maxPaybackToken1: false,
                    isDirect: false
                }),
                t3VaultsSelected[i]
            );
        }
    }

    function test_partial_payback_in_token_1_more_than_initial_borrow() public {
        for (uint256 i = 0; i < t3VaultsSelected.length; ++i) {
            _baseTest(
                TestConfig({
                    initialBorrowToken0AmountUSD: 20_000,
                    initialBorrowToken1AmountUSD: 50_000,
                    paybackToken0AmountUSD: 0,
                    paybackToken1AmountUSD: 60_000,
                    maxPaybackToken0: false,
                    maxPaybackToken1: false,
                    isDirect: false
                }),
                t3VaultsSelected[i]
            );
        }
    }

    function test_partial_payback_in_both_tokens() public {
        for (uint256 i = 0; i < t3VaultsSelected.length; ++i) {
            _baseTest(
                TestConfig({
                    initialBorrowToken0AmountUSD: 40_000,
                    initialBorrowToken1AmountUSD: 50_000,
                    paybackToken0AmountUSD: 30_000,
                    paybackToken1AmountUSD: 30_000,
                    maxPaybackToken0: false,
                    maxPaybackToken1: false,
                    isDirect: false
                }),
                t3VaultsSelected[i]
            );
        }
    }

    function test_payback_action_direct() public {
        for (uint256 i = 0; i < t3VaultsSelected.length; ++i) {
            _baseTest(
                TestConfig({
                    initialBorrowToken0AmountUSD: 35_000,
                    initialBorrowToken1AmountUSD: 0,
                    paybackToken0AmountUSD: 30_000,
                    paybackToken1AmountUSD: 0,
                    maxPaybackToken0: false,
                    maxPaybackToken1: false,
                    isDirect: true
                }),
                t3VaultsSelected[i]
            );
        }
    }

    function test_max_payback_in_token_0() public {
        for (uint256 i = 0; i < t3VaultsSelected.length; ++i) {
            _baseTest(
                TestConfig({
                    initialBorrowToken0AmountUSD: 35_000,
                    initialBorrowToken1AmountUSD: 0,
                    paybackToken0AmountUSD: 450_000, // make sure user always has enough debt to pull
                    paybackToken1AmountUSD: 0,
                    maxPaybackToken0: true,
                    maxPaybackToken1: false,
                    isDirect: false
                }),
                t3VaultsSelected[i]
            );
        }
    }

    function test_max_payback_in_token_1() public {
        for (uint256 i = 0; i < t3VaultsSelected.length; ++i) {
            _baseTest(
                TestConfig({
                    initialBorrowToken0AmountUSD: 10_000,
                    initialBorrowToken1AmountUSD: 35_000,
                    paybackToken0AmountUSD: 0,
                    paybackToken1AmountUSD: 55_000, // make sure user always has enough debt to pull
                    maxPaybackToken0: false,
                    maxPaybackToken1: true,
                    isDirect: false
                }),
                t3VaultsSelected[i]
            );
        }
    }

    function _baseTest(TestConfig memory _config, bool _t3VaultsSelected) internal {
        uint256 initialSupplyAmountUSD =
            (_config.initialBorrowToken0AmountUSD + _config.initialBorrowToken1AmountUSD) * 3;

        address[] memory vaults = _t3VaultsSelected ? t3Vaults : t4Vaults;

        for (uint256 i = 0; i < vaults.length; ++i) {
            uint256 nftId = _t3VaultsSelected
                ? executeFluidVaultT3Open(
                    vaults[i],
                    initialSupplyAmountUSD,
                    _config.initialBorrowToken0AmountUSD,
                    _config.initialBorrowToken1AmountUSD,
                    wallet,
                    address(openContract)
                )
                : executeFluidVaultT4Open(
                    vaults[i],
                    initialSupplyAmountUSD,
                    0, /* initial supply amount 1 in usd */
                    _config.initialBorrowToken0AmountUSD,
                    _config.initialBorrowToken1AmountUSD,
                    wallet,
                    address(openContract)
                );

            if (nftId == 0) {
                logSkipTestBecauseOfOpen(vaults[i]);
                continue;
            }

            FluidView.VaultData memory vaultData = fluidView.getVaultData(vaults[i]);
            LocalVars memory vars;

            (vaultData.borrowToken0, vars.paybackAmount0) =
                giveAndApproveToken(vaultData.borrowToken0, sender, walletAddr, _config.paybackToken0AmountUSD);

            (vaultData.borrowToken1, vars.paybackAmount1) =
                giveAndApproveToken(vaultData.borrowToken1, sender, walletAddr, _config.paybackToken1AmountUSD);

            // Calculate shares to burn or debt amount in case of max payback.
            if (_config.maxPaybackToken0) {
                vars.maxDebtToPull = estimateDexPositionDebtInOneToken(nftId, true, fluidView);
            } else if (_config.maxPaybackToken1) {
                vars.maxDebtToPull = estimateDexPositionDebtInOneToken(nftId, false, fluidView);
            } else {
                vars.estimatedSharesToBurn =
                    estimatePaybackShares(vaultData.dexBorrowData.dexPool, vars.paybackAmount0, vars.paybackAmount1);
            }

            vars.paybackVariableData = FluidDexModel.PaybackVariableData({
                debtAmount0: _config.maxPaybackToken0 ? type(uint256).max : vars.paybackAmount0,
                debtAmount1: _config.maxPaybackToken1 ? type(uint256).max : vars.paybackAmount1,
                minDebtShares: vars.estimatedSharesToBurn,
                maxAmountToPull: vars.maxDebtToPull
            });

            vars.executeActionCallData = executeActionCalldata(
                fluidDexPaybackEncode(
                    vaults[i],
                    sender,
                    nftId,
                    0, /* paybackAmount - Only used for T1-T2 vaults*/
                    vars.paybackVariableData
                ),
                _config.isDirect
            );

            // Take snapshot before action execution.
            vars.senderBorrowToken0BalanceBefore = balanceOf(vaultData.borrowToken0, sender);
            vars.senderBorrowToken1BalanceBefore = balanceOf(vaultData.borrowToken1, sender);
            vars.senderEthBalanceBefore = address(sender).balance;
            vars.walletBorrowToken0BalanceBefore = balanceOf(vaultData.borrowToken0, walletAddr);
            vars.walletBorrowToken1BalanceBefore = balanceOf(vaultData.borrowToken1, walletAddr);
            vars.walletEthBalanceBefore = address(walletAddr).balance;
            vars.userPositionBefore = fetchPositionByNftId(nftId);

            // Execute action.
            wallet.execute(address(cut), vars.executeActionCallData, 0);

            // Take snapshot after action execution.
            vars.senderBorrowToken0BalanceAfter = balanceOf(vaultData.borrowToken0, sender);
            vars.senderBorrowToken1BalanceAfter = balanceOf(vaultData.borrowToken1, sender);
            vars.senderEthBalanceAfter = address(sender).balance;
            vars.walletBorrowToken0BalanceAfter = balanceOf(vaultData.borrowToken0, walletAddr);
            vars.walletBorrowToken1BalanceAfter = balanceOf(vaultData.borrowToken1, walletAddr);
            vars.walletEthBalanceAfter = address(walletAddr).balance;
            vars.userPositionAfter = fetchPositionByNftId(nftId);

            // Assertions.

            // No direct usage of eth
            assertEq(vars.senderEthBalanceBefore, vars.senderEthBalanceAfter);

            // Verify no dust left on wallet.
            assertEq(vars.walletBorrowToken0BalanceAfter, vars.walletBorrowToken0BalanceBefore);
            assertEq(vars.walletBorrowToken1BalanceAfter, vars.walletBorrowToken1BalanceBefore);
            assertEq(vars.walletEthBalanceAfter, vars.walletEthBalanceBefore);

            if (_config.maxPaybackToken0) {
                assertEq(vars.userPositionAfter.isLiquidated, false);
                assertEq(vars.userPositionAfter.borrow, 0);
                uint256 token0Pulled = vars.senderBorrowToken0BalanceBefore - vars.senderBorrowToken0BalanceAfter;
                assertTrue(token0Pulled > 0);
                assertTrue(token0Pulled <= vars.maxDebtToPull);
            } else if (_config.maxPaybackToken1) {
                assertEq(vars.userPositionAfter.isLiquidated, false);
                assertEq(vars.userPositionAfter.borrow, 0);
                uint256 token1Pulled = vars.senderBorrowToken1BalanceBefore - vars.senderBorrowToken1BalanceAfter;
                assertTrue(token1Pulled > 0);
                assertTrue(token1Pulled <= vars.maxDebtToPull);
            } else {
                assertEq(vars.userPositionAfter.isLiquidated, false);
                assertTrue(vars.userPositionAfter.borrow < vars.userPositionBefore.borrow);
                assertEq(
                    vars.senderBorrowToken0BalanceAfter, vars.senderBorrowToken0BalanceBefore - vars.paybackAmount0
                );
                assertEq(
                    vars.senderBorrowToken1BalanceAfter, vars.senderBorrowToken1BalanceBefore - vars.paybackAmount1
                );
            }
        }
    }
}
