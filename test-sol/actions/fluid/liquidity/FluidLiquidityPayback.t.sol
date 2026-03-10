// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    IFluidVault
} from "../../../../contracts/interfaces/protocols/fluid/vaults/IFluidVault.sol";
import {
    IFluidVaultResolver
} from "../../../../contracts/interfaces/protocols/fluid/resolvers/IFluidVaultResolver.sol";
import { FluidVaultT1Open } from "../../../../contracts/actions/fluid/vaultT1/FluidVaultT1Open.sol";
import {
    FluidVaultT1Payback
} from "../../../../contracts/actions/fluid/vaultT1/FluidVaultT1Payback.sol";
import { FluidDexOpen } from "../../../../contracts/actions/fluid/dex/FluidDexOpen.sol";
import { FluidDexPayback } from "../../../../contracts/actions/fluid/dex/FluidDexPayback.sol";
import { FluidDexModel } from "../../../../contracts/actions/fluid/helpers/FluidDexModel.sol";
import { TokenUtils } from "../../../../contracts/utils/token/TokenUtils.sol";
import { SmartWallet } from "../../../utils/SmartWallet.sol";
import { Vm } from "forge-std/Vm.sol";
import { FluidTestBase } from "../FluidTestBase.t.sol";

contract TestFluidLiquidityPayback is FluidTestBase {
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    FluidVaultT1Payback cut_FluidVaultT1Payback;
    FluidDexPayback cut_FluidDexPayback;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/

    SmartWallet wallet;
    address sender;
    address walletAddr;

    address[] t1Vaults;
    address[] t2Vaults;

    FluidVaultT1Open t1OpenContract;
    FluidDexOpen t2OpenContract;

    bool[] t1VaultsSelected;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("FluidLiquidityPayback");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut_FluidVaultT1Payback = new FluidVaultT1Payback();
        cut_FluidDexPayback = new FluidDexPayback();

        t1OpenContract = new FluidVaultT1Open();
        t2OpenContract = new FluidDexOpen();

        t1Vaults = getT1Vaults();
        t2Vaults = getT2Vaults();

        t1VaultsSelected = new bool[](2);
        t1VaultsSelected[0] = true;
        t1VaultsSelected[1] = false;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_payback_part() public {
        bool isDirect = false;
        bool isMaxPayback = false;
        uint256 initialSupplyAmountUSD = 50_000;
        uint256 initialBorrowAmountUSD = 30_000;
        uint256 paybackAmountUSD = 10_000;

        for (uint256 i = 0; i < t1VaultsSelected.length; ++i) {
            _baseTest(
                isDirect,
                isMaxPayback,
                initialSupplyAmountUSD,
                initialBorrowAmountUSD,
                paybackAmountUSD,
                t1VaultsSelected[i]
            );
        }
    }

    function test_should_payback_action_direct() public {
        bool isDirect = true;
        bool isMaxPayback = false;
        uint256 initialSupplyAmountUSD = 50_000;
        uint256 initialBorrowAmountUSD = 30_000;
        uint256 paybackAmountUSD = 10_000;

        for (uint256 i = 0; i < t1VaultsSelected.length; ++i) {
            _baseTest(
                isDirect,
                isMaxPayback,
                initialSupplyAmountUSD,
                initialBorrowAmountUSD,
                paybackAmountUSD,
                t1VaultsSelected[i]
            );
        }
    }

    function test_should_payback_with_different_amounts() public {
        bool isDirect = false;
        bool isMaxPayback = false;

        uint256[] memory paybackAmounts = new uint256[](5);
        paybackAmounts[0] = 99;
        paybackAmounts[1] = 9982;
        paybackAmounts[2] = 29_178;
        paybackAmounts[3] = 3333;
        paybackAmounts[4] = 31_112;

        uint256 initialSupplyAmountUSD = 50_000;
        uint256 initialBorrowAmountUSD = 31_113;

        for (uint256 i = 0; i < paybackAmounts.length; ++i) {
            for (uint256 j = 0; j < t1VaultsSelected.length; ++j) {
                _baseTest(
                    isDirect,
                    isMaxPayback,
                    initialSupplyAmountUSD,
                    initialBorrowAmountUSD,
                    paybackAmounts[i],
                    t1VaultsSelected[j]
                );
            }
        }
    }

    function test_should_max_payback() public {
        bool isDirect = false;
        bool isMaxPayback = true;

        uint256 initSupplyAmountsUSD = 100_000;
        uint256[] memory initBorrowAmountsUSD = new uint256[](5);
        initBorrowAmountsUSD[0] = 50_001;
        initBorrowAmountsUSD[1] = 31_122;
        initBorrowAmountsUSD[2] = 100;
        initBorrowAmountsUSD[3] = 22_567;
        initBorrowAmountsUSD[4] = 999;

        for (uint256 i = 0; i < initBorrowAmountsUSD.length; ++i) {
            for (uint256 j = 0; j < t1VaultsSelected.length; ++j) {
                _baseTest(
                    isDirect,
                    isMaxPayback,
                    initSupplyAmountsUSD,
                    initBorrowAmountsUSD[i],
                    type(uint256).max,
                    t1VaultsSelected[j]
                );
            }
        }
    }

    struct TempLocalVars {
        uint256 senderBorrowTokenBalanceBefore;
        uint256 senderBorrowTokenBalanceAfter;
        uint256 senderEthBalanceBefore;
        uint256 senderEthBalanceAfter;
        uint256 walletBorrowTokenBalanceBefore;
        uint256 walletBorrowTokenBalanceAfter;
    }

    function _baseTest(
        bool _isDirect,
        bool _isMaxPayback,
        uint256 _initialSupplyAmountUSD,
        uint256 _initialBorrowAmountUSD,
        uint256 _paybackAmountUSD,
        bool _t1VaultsSelected
    ) internal {
        address[] memory vaults = _t1VaultsSelected ? t1Vaults : t2Vaults;

        for (uint256 i = 0; i < vaults.length; ++i) {
            uint256 nftId = _t1VaultsSelected
                ? executeFluidVaultT1Open(
                    address(vaults[i]),
                    _initialSupplyAmountUSD,
                    _initialBorrowAmountUSD,
                    wallet,
                    address(t1OpenContract)
                )
                : executeFluidVaultT2Open(
                    address(vaults[i]),
                    _initialSupplyAmountUSD, /* initial coll amount 0 in usd */
                    0, /* initial coll amount 1 in usd */
                    _initialBorrowAmountUSD, /* initial borrow amount in usd */
                    wallet,
                    address(t2OpenContract)
                );

            if (!_t1VaultsSelected && nftId == 0) {
                logSkipTestBecauseOfOpen(vaults[i]);
                continue;
            }

            FluidTestBase.TokensData memory tokens = getTokens(vaults[i], _t1VaultsSelected);

            bool isNativePayback = tokens.borrow0 == TokenUtils.ETH_ADDR;
            tokens.borrow0 = isNativePayback ? TokenUtils.WETH_ADDR : tokens.borrow0;

            IFluidVaultResolver.UserPosition memory userPositionBefore = fetchPositionByNftId(nftId);

            uint256 paybackAmount = _isMaxPayback
                ? userPositionBefore.borrow * 1001 / 1000  // add 0.1% buffer
                : amountInUSDPrice(tokens.borrow0, _paybackAmountUSD);

            give(tokens.borrow0, sender, paybackAmount);
            approveAsSender(sender, tokens.borrow0, walletAddr, 0); // To handle Tether
            approveAsSender(sender, tokens.borrow0, walletAddr, paybackAmount);

            bytes memory executeActionCallData = executeActionCalldata(
                _t1VaultsSelected
                    ? fluidVaultT1PaybackEncode(address(vaults[i]), nftId, paybackAmount, sender)
                    : fluidDexPaybackEncode(
                        address(vaults[i]),
                        sender,
                        nftId,
                        paybackAmount,
                        FluidDexModel.PaybackVariableData(0, 0, 0, 0)
                    ),
                _isDirect
            );

            TempLocalVars memory vars;

            vars.senderBorrowTokenBalanceBefore = balanceOf(tokens.borrow0, sender);
            vars.senderEthBalanceBefore = address(sender).balance;
            vars.walletBorrowTokenBalanceBefore = isNativePayback
                ? address(walletAddr).balance
                : balanceOf(tokens.borrow0, walletAddr);

            vm.recordLogs();
            wallet.execute(
                _t1VaultsSelected ? address(cut_FluidVaultT1Payback) : address(cut_FluidDexPayback),
                executeActionCallData,
                0
            );
            Vm.Log[] memory logs = vm.getRecordedLogs();

            vars.senderBorrowTokenBalanceAfter = balanceOf(tokens.borrow0, sender);
            vars.senderEthBalanceAfter = address(sender).balance;
            vars.walletBorrowTokenBalanceAfter = isNativePayback
                ? address(walletAddr).balance
                : balanceOf(tokens.borrow0, walletAddr);

            IFluidVaultResolver.UserPosition memory userPositionAfter = fetchPositionByNftId(nftId);

            // make sure no dust is left on wallet
            assertEq(vars.walletBorrowTokenBalanceAfter, vars.walletBorrowTokenBalanceBefore);

            if (_isMaxPayback) {
                assertEq(userPositionAfter.borrow, 0);

                if (isNativePayback) {
                    uint256 pulledWeth =
                        vars.senderBorrowTokenBalanceBefore - vars.senderBorrowTokenBalanceAfter;
                    uint256 exactPaybackAmount;
                    // parse logs to find exact payback amount
                    for (uint256 j = 0; i < logs.length; ++j) {
                        if (logs[j].topics[0] == IFluidVault.LogOperate.selector) {
                            (,,, int256 debtAmt,) = abi.decode(
                                logs[j].data, (address, uint256, int256, int256, address)
                            );
                            exactPaybackAmount = uint256(-debtAmt);
                            break;
                        }
                    }
                    assertTrue(exactPaybackAmount > 0);
                    uint256 expectedEthRefund = pulledWeth - exactPaybackAmount;
                    assertEq(
                        vars.senderEthBalanceAfter - vars.senderEthBalanceBefore, expectedEthRefund
                    );
                } else {
                    assertApproxEqRel(
                        vars.senderBorrowTokenBalanceAfter,
                        vars.senderBorrowTokenBalanceBefore - userPositionBefore.borrow,
                        1e15 // 0.1% tolerance
                    );
                }
            } else {
                assertEq(
                    vars.senderBorrowTokenBalanceAfter,
                    vars.senderBorrowTokenBalanceBefore - paybackAmount
                );
                assertApproxEqRel(
                    userPositionAfter.borrow,
                    userPositionBefore.borrow - paybackAmount,
                    1e15 // 0.1% tolerance
                );
            }
        }
    }
}
