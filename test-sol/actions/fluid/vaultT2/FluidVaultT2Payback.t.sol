// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVault } from "../../../../contracts/interfaces/fluid/vaults/IFluidVault.sol";
import { IFluidVaultT2 } from "../../../../contracts/interfaces/fluid/vaults/IFluidVaultT2.sol";
import { IFluidVaultResolver } from "../../../../contracts/interfaces/fluid/resolvers/IFluidVaultResolver.sol";
import { FluidDexPayback } from "../../../../contracts/actions/fluid/dex/FluidDexPayback.sol";
import { FluidView } from "../../../../contracts/views/FluidView.sol";
import { FluidDexOpen } from "../../../../contracts/actions/fluid/dex/FluidDexOpen.sol";
import { FluidDexModel } from "../../../../contracts/actions/fluid/helpers/FluidDexModel.sol";
import { TokenUtils } from "../../../../contracts/utils/TokenUtils.sol";
import { FluidTestBase } from "../FluidTestBase.t.sol";
import { SmartWallet } from "../../../utils/SmartWallet.sol";
import { Vm } from "forge-std/Vm.sol";

contract TestFluidVaultT2Payback is FluidTestBase {

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
    IFluidVaultT2[] vaults;

    FluidDexOpen openContract;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new FluidDexPayback();
        openContract = new FluidDexOpen();

        vaults = getT2Vaults();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_payback_part() public {
        bool isDirect = false;
        bool isMaxPayback = false;
        uint256 initialSupplyAmountUSD = 50000;
        uint256 initialBorrowAmountUSD = 30000;
        uint256 paybackAmountUSD = 10000;
        _baseTest(
            isDirect,
            isMaxPayback,
            initialSupplyAmountUSD,
            initialBorrowAmountUSD,
            paybackAmountUSD
        );
    }

    function test_should_payback_action_direct() public {
        bool isDirect = true;
        bool isMaxPayback = false;
        uint256 initialSupplyAmountUSD = 50000;
        uint256 initialBorrowAmountUSD = 30000;
        uint256 paybackAmountUSD = 10000;
        _baseTest(
            isDirect,
            isMaxPayback,
            initialSupplyAmountUSD,
            initialBorrowAmountUSD,
            paybackAmountUSD
        );
    }

    function test_should_payback_with_different_amounts() public {
        bool isDirect = false;
        bool isMaxPayback = false;

        uint256[] memory paybackAmounts = new uint256[](5);
        paybackAmounts[0] = 99;
        paybackAmounts[1] = 9982;
        paybackAmounts[2] = 29178;
        paybackAmounts[3] = 3333;
        paybackAmounts[4] = 31112;

        uint256 initialSupplyAmountUSD = 50000;
        uint256 initialBorrowAmountUSD = 31113;

        for (uint256 i = 0; i < paybackAmounts.length; ++i) {
            _baseTest(
                isDirect,
                isMaxPayback,
                initialSupplyAmountUSD,
                initialBorrowAmountUSD,
                paybackAmounts[i]
            );
        }
    }
    
    function test_should_max_payback() public {
        bool isDirect = false;
        bool isMaxPayback = true;

        uint256 initSupplyAmountsUSD = 100000;
        uint256[] memory initBorrowAmountsUSD = new uint256[](5);
        initBorrowAmountsUSD[0] = 50001;
        initBorrowAmountsUSD[1] = 31122;
        initBorrowAmountsUSD[2] = 100;
        initBorrowAmountsUSD[3] = 22567;
        initBorrowAmountsUSD[4] = 999;

        for (uint256 i = 0; i < initBorrowAmountsUSD.length; ++i) {
            _baseTest(
                isDirect,
                isMaxPayback,
                initSupplyAmountsUSD,
                initBorrowAmountsUSD[i],
                type(uint256).max
            );
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
        uint256 _paybackAmountUSD
    ) internal {
        for (uint256 i = 0; i < vaults.length; ++i) {

            uint256 nftId = executeFluidVaultT2Open(
                address(vaults[i]),
                _initialSupplyAmountUSD, /* initial coll amount 0 in usd */
                0, /* initial coll amount 1 in usd */
                _initialBorrowAmountUSD, /* initial borrow amount in usd */
                wallet,
                address(openContract)
            );

            if (nftId == 0) {
                emit log_named_address("Skipping test: Could't open fluid position for vault:", address(vaults[i]));
                continue;
            }

            IFluidVaultT2.ConstantViews memory constants = vaults[i].constantsView();
            bool isNativePayback = constants.borrowToken.token0 == TokenUtils.ETH_ADDR;
            constants.borrowToken.token0 = isNativePayback ? TokenUtils.WETH_ADDR : constants.borrowToken.token0;

            IFluidVaultResolver.UserPosition memory userPositionBefore = fetchPositionByNftId(nftId);

            uint256 paybackAmount = _isMaxPayback
                ? userPositionBefore.borrow * 1001 / 1000 // add 0.1% buffer
                : amountInUSDPrice(constants.borrowToken.token0, _paybackAmountUSD);

            give(constants.borrowToken.token0, sender, paybackAmount);
            approveAsSender(sender, constants.borrowToken.token0, walletAddr, 0); // To handle Tether
            approveAsSender(sender, constants.borrowToken.token0, walletAddr, paybackAmount);

            bytes memory executeActionCallData = executeActionCalldata(
                fluidDexPaybackEncode(
                    address(vaults[i]),
                    sender,
                    nftId,
                    paybackAmount,
                    FluidDexModel.PaybackVariableData(0, 0, 0) /* used for T3 and T4 vaults */
                ),
                _isDirect
            );

            TempLocalVars memory vars;

            vars.senderBorrowTokenBalanceBefore = balanceOf(constants.borrowToken.token0, sender);
            vars.senderEthBalanceBefore = address(sender).balance;
            vars.walletBorrowTokenBalanceBefore = isNativePayback
                ? address(walletAddr).balance
                : balanceOf(constants.borrowToken.token0, walletAddr);

            vm.recordLogs();
            wallet.execute(address(cut), executeActionCallData, 0);
            Vm.Log[] memory logs = vm.getRecordedLogs();

            vars.senderBorrowTokenBalanceAfter = balanceOf(constants.borrowToken.token0, sender);
            vars.senderEthBalanceAfter = address(sender).balance;
            vars.walletBorrowTokenBalanceAfter = isNativePayback
                ? address(walletAddr).balance
                : balanceOf(constants.borrowToken.token0, walletAddr);

            IFluidVaultResolver.UserPosition memory userPositionAfter = fetchPositionByNftId(nftId);

            // make sure no dust is left on wallet
            assertEq(vars.walletBorrowTokenBalanceAfter, vars.walletBorrowTokenBalanceBefore);
            
            if (_isMaxPayback) {
                assertEq(userPositionAfter.borrow, 0);

                if (isNativePayback) {
                    uint256 pulledWeth = vars.senderBorrowTokenBalanceBefore - vars.senderBorrowTokenBalanceAfter;
                    uint256 exactPaybackAmount;
                    // parse logs to find exact payback amount
                    for (uint256 j = 0; i < logs.length; ++j) {
                        if (logs[j].topics[0] == IFluidVault.LogOperate.selector) {
                            ( , , , int256 debtAmt , ) = abi.decode(
                                logs[j].data,
                                (address, uint256, int256, int256, address)
                            );
                            exactPaybackAmount = uint256(-debtAmt);
                            break;
                        }
                    }
                    assertTrue(exactPaybackAmount > 0);
                    uint256 expectedEthRefund = pulledWeth - exactPaybackAmount;
                    assertEq(vars.senderEthBalanceAfter - vars.senderEthBalanceBefore, expectedEthRefund);
                } else {
                    assertApproxEqRel(
                        vars.senderBorrowTokenBalanceAfter,
                        vars.senderBorrowTokenBalanceBefore - userPositionBefore.borrow,
                        1e15 // 0.1% tolerance
                    );
                }
            } else {
                assertEq(vars.senderBorrowTokenBalanceAfter, vars.senderBorrowTokenBalanceBefore - paybackAmount);
                assertApproxEqRel(
                    userPositionAfter.borrow,
                    userPositionBefore.borrow - paybackAmount,
                    1e15 // 0.1% tolerance
                );
            }
        }
    }
}