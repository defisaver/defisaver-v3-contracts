// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { FluidView } from "../../../../contracts/views/FluidView.sol";
import { FluidDexOpen } from "../../../../contracts/actions/fluid/dex/FluidDexOpen.sol";
import { FluidDexModel } from "../../../../contracts/actions/fluid/helpers/FluidDexModel.sol";
import { SmartWallet } from "../../../utils/SmartWallet.sol";
import { TokenUtils } from "../../../../contracts/utils/token/TokenUtils.sol";
import { Vm } from "forge-std/Vm.sol";
import { FluidTestBase } from "../FluidTestBase.t.sol";

contract TestFluidDexOpenT3 is FluidTestBase {
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    FluidDexOpen cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/

    SmartWallet wallet;
    address sender;
    address walletAddr;
    address[] vaults;
    FluidView fluidView;

    struct TestConfig {
        uint256 collAmountInUSD;
        bool takeMaxUint256CollAmount;
        uint256 borrowAmount0InUSD;
        uint256 borrowAmount1InUSD;
        bool wrapBorrowedEth;
        bool isDirect;
    }

    struct LocalVars {
        uint256 collAmount;
        uint256 borrowAmount0;
        uint256 borrowAmount1;
        bool isNativeSupply;
        bool isNativeBorrow0;
        bool isNativeBorrow1;
        bytes executeActionCallData;
        uint256 debtShares;
        uint256 senderCollTokenBalanceBefore;
        uint256 senderBorrowToken0BalanceBefore;
        uint256 senderBorrowToken1BalanceBefore;
        uint256 senderCollTokenBalanceAfter;
        uint256 senderBorrowToken0BalanceAfter;
        uint256 senderBorrowToken1BalanceAfter;
        uint256 walletCollTokenBalanceBefore;
        uint256 walletBorrowToken0BalanceBefore;
        uint256 walletBorrowToken1BalanceBefore;
        uint256 walletEthBalanceBefore;
        uint256 walletCollTokenBalanceAfter;
        uint256 walletBorrowToken0BalanceAfter;
        uint256 walletBorrowToken1BalanceAfter;
        uint256 walletEthBalanceAfter;
        FluidView.UserPosition userPositionAfter;
        uint256 createdNft;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("FluidDexOpen");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new FluidDexOpen();

        vaults = getT3Vaults();
        fluidView = new FluidView();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_open_variable_position_with_coll_only() public {
        _baseTest(
            TestConfig({
                collAmountInUSD: 30_000,
                takeMaxUint256CollAmount: false,
                borrowAmount0InUSD: 0,
                borrowAmount1InUSD: 0,
                wrapBorrowedEth: false,
                isDirect: false
            })
        );
    }

    function test_should_open_variable_position_with_coll_and_borrow0() public {
        _baseTest(
            TestConfig({
                collAmountInUSD: 30_000,
                takeMaxUint256CollAmount: false,
                borrowAmount0InUSD: 10_000,
                borrowAmount1InUSD: 0,
                wrapBorrowedEth: false,
                isDirect: false
            })
        );
    }

    function test_should_open_variable_position_with_coll_and_borrow1() public {
        _baseTest(
            TestConfig({
                collAmountInUSD: 30_000,
                takeMaxUint256CollAmount: false,
                borrowAmount0InUSD: 0,
                borrowAmount1InUSD: 10_000,
                wrapBorrowedEth: false,
                isDirect: false
            })
        );
    }

    function test_should_open_variable_position_with_coll_and_both_borrows() public {
        _baseTest(
            TestConfig({
                collAmountInUSD: 40_000,
                takeMaxUint256CollAmount: false,
                borrowAmount0InUSD: 10_000,
                borrowAmount1InUSD: 10_000,
                wrapBorrowedEth: false,
                isDirect: false
            })
        );
    }

    function test_should_open_variable_position_with_coll_maxUint256() public {
        _baseTest(
            TestConfig({
                collAmountInUSD: 30_000,
                takeMaxUint256CollAmount: true,
                borrowAmount0InUSD: 10_000,
                borrowAmount1InUSD: 0,
                wrapBorrowedEth: false,
                isDirect: false
            })
        );
    }

    function test_should_open_variable_position_with_borrow_eth_wrap() public {
        _baseTest(
            TestConfig({
                collAmountInUSD: 30_000,
                takeMaxUint256CollAmount: false,
                borrowAmount0InUSD: 10_000,
                borrowAmount1InUSD: 0,
                wrapBorrowedEth: true,
                isDirect: false
            })
        );
    }

    function test_should_open_variable_position_action_direct() public {
        _baseTest(
            TestConfig({
                collAmountInUSD: 30_000,
                takeMaxUint256CollAmount: false,
                borrowAmount0InUSD: 10_000,
                borrowAmount1InUSD: 0,
                wrapBorrowedEth: false,
                isDirect: true
            })
        );
    }

    function _baseTest(TestConfig memory _config) internal {
        for (uint256 i = 0; i < vaults.length; ++i) {
            FluidView.VaultData memory vaultData = fluidView.getVaultData(vaults[i]);
            LocalVars memory vars;

            // Handle collateral setup for T3 open
            vars.isNativeSupply = vaultData.supplyToken0 == TokenUtils.ETH_ADDR;
            (vaultData.supplyToken0, vars.collAmount) =
                giveAndApproveToken(vaultData.supplyToken0, sender, walletAddr, _config.collAmountInUSD);

            // Handle borrow token 0 setup
            vars.isNativeBorrow0 = vaultData.borrowToken0 == TokenUtils.ETH_ADDR;
            vars.borrowAmount0 = _config.borrowAmount0InUSD != 0
                ? amountInUSDPrice(
                    vars.isNativeBorrow0 ? TokenUtils.WETH_ADDR : vaultData.borrowToken0, _config.borrowAmount0InUSD
                )
                : 0;

            // Handle borrow token 1 setup
            vars.isNativeBorrow1 = vaultData.borrowToken1 == TokenUtils.ETH_ADDR;
            vars.borrowAmount1 = _config.borrowAmount1InUSD != 0
                ? amountInUSDPrice(
                    vars.isNativeBorrow1 ? TokenUtils.WETH_ADDR : vaultData.borrowToken1, _config.borrowAmount1InUSD
                )
                : 0;

            // Estimate debt shares
            vars.debtShares =
                estimateBorrowShares(vaultData.dexBorrowData.dexPool, vars.borrowAmount0, vars.borrowAmount1);

            // Validate borrow limit
            if (borrowLimitReached(vaultData.dexBorrowData, vars.debtShares)) {
                logBorrowLimitReached(vaults[i]);
                continue;
            }

            // Encode call data
            vars.executeActionCallData = executeActionCalldata(
                fluidDexOpenEncode(
                    vaults[i],
                    sender, /* from */
                    sender, /* to */
                    _config.takeMaxUint256CollAmount ? type(uint256).max : vars.collAmount,
                    FluidDexModel.SupplyVariableData(0, 0, 0), /* only used for T2 and T4 vaults */
                    0, /* borrowAmount - Only used for T1 and T2 vaults */
                    FluidDexModel.BorrowVariableData(vars.borrowAmount0, vars.borrowAmount1, vars.debtShares),
                    _config.wrapBorrowedEth
                ),
                _config.isDirect
            );

            // Take snapshot before action execution
            vars.senderCollTokenBalanceBefore = balanceOf(vaultData.supplyToken0, sender);
            vars.senderBorrowToken0BalanceBefore = vars.isNativeBorrow0
                ? (_config.wrapBorrowedEth ? balanceOf(TokenUtils.WETH_ADDR, sender) : address(sender).balance)
                : balanceOf(vaultData.borrowToken0, sender);
            vars.senderBorrowToken1BalanceBefore = vars.isNativeBorrow1
                ? (_config.wrapBorrowedEth ? balanceOf(TokenUtils.WETH_ADDR, sender) : address(sender).balance)
                : balanceOf(vaultData.borrowToken1, sender);

            vars.walletCollTokenBalanceBefore = balanceOf(vaultData.supplyToken0, walletAddr);
            vars.walletBorrowToken0BalanceBefore = vars.isNativeBorrow0
                ? balanceOf(TokenUtils.WETH_ADDR, walletAddr)
                : balanceOf(vaultData.borrowToken0, walletAddr);
            vars.walletBorrowToken1BalanceBefore = vars.isNativeBorrow1
                ? balanceOf(TokenUtils.WETH_ADDR, walletAddr)
                : balanceOf(vaultData.borrowToken1, walletAddr);
            vars.walletEthBalanceBefore = address(walletAddr).balance;

            // Execute action
            vm.recordLogs();
            wallet.execute(address(cut), vars.executeActionCallData, 0);
            Vm.Log[] memory logs = vm.getRecordedLogs();
            vars.createdNft = getNftIdFromLogs(logs);

            // Take snapshot after action execution
            vars.senderCollTokenBalanceAfter = balanceOf(vaultData.supplyToken0, sender);
            vars.senderBorrowToken0BalanceAfter = vars.isNativeBorrow0
                ? (_config.wrapBorrowedEth ? balanceOf(TokenUtils.WETH_ADDR, sender) : address(sender).balance)
                : balanceOf(vaultData.borrowToken0, sender);
            vars.senderBorrowToken1BalanceAfter = vars.isNativeBorrow1
                ? (_config.wrapBorrowedEth ? balanceOf(TokenUtils.WETH_ADDR, sender) : address(sender).balance)
                : balanceOf(vaultData.borrowToken1, sender);

            vars.walletCollTokenBalanceAfter = balanceOf(vaultData.supplyToken0, walletAddr);
            vars.walletBorrowToken0BalanceAfter = vars.isNativeBorrow0
                ? balanceOf(TokenUtils.WETH_ADDR, walletAddr)
                : balanceOf(vaultData.borrowToken0, walletAddr);
            vars.walletBorrowToken1BalanceAfter = vars.isNativeBorrow1
                ? balanceOf(TokenUtils.WETH_ADDR, walletAddr)
                : balanceOf(vaultData.borrowToken1, walletAddr);
            vars.walletEthBalanceAfter = address(walletAddr).balance;

            (vars.userPositionAfter,) = fluidView.getPositionByNftId(vars.createdNft);

            // Assertions
            // Verify no dust left on wallet
            assertEq(vars.walletCollTokenBalanceAfter, vars.walletCollTokenBalanceBefore);
            assertEq(vars.walletBorrowToken0BalanceAfter, vars.walletBorrowToken0BalanceBefore);
            assertEq(vars.walletBorrowToken1BalanceAfter, vars.walletBorrowToken1BalanceBefore);
            assertEq(vars.walletEthBalanceAfter, vars.walletEthBalanceBefore);

            assertTrue(vars.createdNft != 0);

            // Check collateral was taken
            assertEq(vars.senderCollTokenBalanceAfter, vars.senderCollTokenBalanceBefore - vars.collAmount);

            // Check borrowed funds were received
            if (vars.borrowAmount0 > 0) {
                assertEq(vars.senderBorrowToken0BalanceAfter, vars.senderBorrowToken0BalanceBefore + vars.borrowAmount0);
            }

            if (vars.borrowAmount1 > 0) {
                assertEq(vars.senderBorrowToken1BalanceAfter, vars.senderBorrowToken1BalanceBefore + vars.borrowAmount1);
            }

            // Check position data
            assertEq(vars.userPositionAfter.owner, walletAddr);
            assertEq(vars.userPositionAfter.isLiquidated, false);
            assertEq(vars.userPositionAfter.isSupplyPosition, vars.borrowAmount0 == 0 && vars.borrowAmount1 == 0);

            emit log_named_uint("createdNftId", vars.createdNft);
            emit log_named_uint("supply", vars.userPositionAfter.supply);
            emit log_named_uint("borrow", vars.userPositionAfter.borrow);
        }
    }
}
