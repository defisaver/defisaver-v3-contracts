// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVaultT2 } from "../../../../contracts/interfaces/fluid/vaults/IFluidVaultT2.sol";
import { IFluidVaultResolver } from "../../../../contracts/interfaces/fluid/resolvers/IFluidVaultResolver.sol";
import { FluidView } from "../../../../contracts/views/FluidView.sol";
import { FluidDexWithdraw } from "../../../../contracts/actions/fluid/dex/FluidDexWithdraw.sol";
import { FluidDexOpen } from "../../../../contracts/actions/fluid/dex/FluidDexOpen.sol";
import { FluidDexModel } from "../../../../contracts/actions/fluid/helpers/FluidDexModel.sol";
import { SmartWallet } from "../../../utils/SmartWallet.sol";
import { TokenUtils } from "../../../../contracts/utils/TokenUtils.sol";
import { FluidTestBase } from "../FluidTestBase.t.sol";

contract TestFluidVaultT2Withdraw is FluidTestBase {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    FluidDexWithdraw cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/

    SmartWallet wallet;
    address sender;
    address walletAddr;
    IFluidVaultT2[] vaults;
    FluidView fluidView;
    FluidDexOpen fluidDexOpen;

    struct TestConfig {
        uint256 initialSupplyToken0AmountUSD;
        uint256 initialSupplyToken1AmountUSD;
        uint256 withdrawToken0AmountInUSD;
        uint256 withdrawToken1AmountInUSD;
        bool takeMaxUint256CollAmount0;
        bool takeMaxUint256CollAmount1;
        bool isDirect;
        bool wrapWithdrawnEth;
    }

    struct LocalVars {
        uint256 collAmount0;
        uint256 collAmount1;
        bytes executeActionCallData;

        bool isToken0Native;
        bool isToken1Native;

        uint256 senderCollToken0BalanceBefore;
        uint256 senderCollToken1BalanceBefore;
        uint256 senderEthBalanceBefore;
        uint256 senderCollToken0BalanceAfter;
        uint256 senderCollToken1BalanceAfter;
        uint256 senderEthBalanceAfter;

        uint256 walletCollToken0BalanceBefore;
        uint256 walletCollToken1BalanceBefore;
        uint256 walletEthBalanceBefore;
        uint256 walletCollToken0BalanceAfter;
        uint256 walletCollToken1BalanceAfter;
        uint256 walletEthBalanceAfter;

        FluidView.VaultData vaultData;
        IFluidVaultResolver.UserPosition userPositionBefore;
        IFluidVaultResolver.UserPosition userPositionAfter;

        FluidDexModel.WithdrawVariableData shareVariableData;
        uint256 shares;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new FluidDexWithdraw();

        vaults = getT2Vaults();
        fluidView = new FluidView();
        fluidDexOpen = new FluidDexOpen();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_partial_withdrawal_coll_0() public {
        _baseTest(
            TestConfig({
                initialSupplyToken0AmountUSD: 50000,
                initialSupplyToken1AmountUSD: 0,
                withdrawToken0AmountInUSD: 30000,
                withdrawToken1AmountInUSD: 0,
                takeMaxUint256CollAmount0: false,
                takeMaxUint256CollAmount1: false,
                isDirect: false,
                wrapWithdrawnEth: false
            })
        );
    }

    function test_should_partial_withdrawal_coll_1() public {
        _baseTest(
            TestConfig({
                initialSupplyToken0AmountUSD: 0,
                initialSupplyToken1AmountUSD: 50000,
                withdrawToken0AmountInUSD: 0,
                withdrawToken1AmountInUSD: 30000,
                takeMaxUint256CollAmount0: false,
                takeMaxUint256CollAmount1: false,
                isDirect: false,
                wrapWithdrawnEth: false
            })
        );
    }

    function test_should_partial_withdrawal_both_coll() public {
        _baseTest(
            TestConfig({
                initialSupplyToken0AmountUSD: 50000,
                initialSupplyToken1AmountUSD: 50000,
                withdrawToken0AmountInUSD: 30000,
                withdrawToken1AmountInUSD: 20000,
                takeMaxUint256CollAmount0: false,
                takeMaxUint256CollAmount1: false,
                isDirect: false,
                wrapWithdrawnEth: false
            })
        );
    }

    function test_should_partial_withdrawal_both_coll_with_wrap() public {
        _baseTest(
            TestConfig({
                initialSupplyToken0AmountUSD: 50000,
                initialSupplyToken1AmountUSD: 50000,
                withdrawToken0AmountInUSD: 11000,
                withdrawToken1AmountInUSD: 5000,
                takeMaxUint256CollAmount0: false,
                takeMaxUint256CollAmount1: false,
                isDirect: false,
                wrapWithdrawnEth: true
            })
        );
    }

    function test_should_withdraw_action_direct() public {
        _baseTest(
            TestConfig({
                initialSupplyToken0AmountUSD: 50000,
                initialSupplyToken1AmountUSD: 50000,
                withdrawToken0AmountInUSD: 30000,
                withdrawToken1AmountInUSD: 0,
                takeMaxUint256CollAmount0: false,
                takeMaxUint256CollAmount1: false,
                isDirect: true,
                wrapWithdrawnEth: false
            })
        );
    }

    function test_should_withdraw_coll_0_maxUint256() public {
        _baseTest(
            TestConfig({
                initialSupplyToken0AmountUSD: 30000,
                initialSupplyToken1AmountUSD: 0,
                withdrawToken0AmountInUSD: 30000,
                withdrawToken1AmountInUSD: 0,
                takeMaxUint256CollAmount0: true,
                takeMaxUint256CollAmount1: false,
                isDirect: false,
                wrapWithdrawnEth: false
            })
        );
    }

    function test_should_withdraw_coll_0_maxUint256_with_wrap() public {
        _baseTest(
            TestConfig({
                initialSupplyToken0AmountUSD: 30000,
                initialSupplyToken1AmountUSD: 0,
                withdrawToken0AmountInUSD: 30000,
                withdrawToken1AmountInUSD: 0,
                takeMaxUint256CollAmount0: true,
                takeMaxUint256CollAmount1: false,
                isDirect: false,
                wrapWithdrawnEth: true
            })
        );
    }

    function test_should_withdraw_coll_1_maxUint256() public {
        _baseTest(
            TestConfig({
                initialSupplyToken0AmountUSD: 0,
                initialSupplyToken1AmountUSD: 50000,
                withdrawToken0AmountInUSD: 0,
                withdrawToken1AmountInUSD: 50000,
                takeMaxUint256CollAmount0: false,
                takeMaxUint256CollAmount1: true,
                isDirect: false,
                wrapWithdrawnEth: false
            })
        );
    }

    function test_should_withdraw_coll_1_maxUint256_with_wrap() public {
        _baseTest(
            TestConfig({
                initialSupplyToken0AmountUSD: 0,
                initialSupplyToken1AmountUSD: 50000,
                withdrawToken0AmountInUSD: 0,
                withdrawToken1AmountInUSD: 50000,
                takeMaxUint256CollAmount0: false,
                takeMaxUint256CollAmount1: true,
                isDirect: false,
                wrapWithdrawnEth: true
            })
        );
    }

    function _baseTest(
        TestConfig memory _config        
    ) internal {
        for (uint256 i = 0; i < vaults.length; ++i) {

            uint256 nftId = executeFluidVaultT2Open(
                address(vaults[i]),
                _config.initialSupplyToken0AmountUSD,
                _config.initialSupplyToken1AmountUSD,
                0, /* initial borrow amount in usd */
                wallet,
                address(fluidDexOpen)
            );

            if (nftId == 0) {
                emit log_named_address("Skipping test: Could't open fluid position for vault:", address(vaults[i]));
                continue;
            }

            FluidView.VaultData memory vaultData = fluidView.getVaultData(address(vaults[i]));
            LocalVars memory vars;

            vars.isToken0Native = vaultData.supplyToken0 == TokenUtils.ETH_ADDR;
            vars.isToken1Native = vaultData.supplyToken1 == TokenUtils.ETH_ADDR;
            vaultData.supplyToken0 = vars.isToken0Native ? TokenUtils.WETH_ADDR : vaultData.supplyToken0;
            vaultData.supplyToken1 = vars.isToken1Native ? TokenUtils.WETH_ADDR : vaultData.supplyToken1;

            vars.collAmount0 =  _config.withdrawToken0AmountInUSD != 0
                ? amountInUSDPrice(vaultData.supplyToken0, _config.withdrawToken0AmountInUSD)
                : 0;

            vars.collAmount1 = _config.withdrawToken1AmountInUSD != 0
                ? amountInUSDPrice(vaultData.supplyToken1, _config.withdrawToken1AmountInUSD)
                : 0;

            vars.shares = estimateWithdrawShares(vaultData.dexSupplyData.dexPool, vars.collAmount0, vars.collAmount1);

            vars.shareVariableData = FluidDexModel.WithdrawVariableData({
                collAmount0: _config.takeMaxUint256CollAmount0 ? type(uint256).max : vars.collAmount0,
                collAmount1: _config.takeMaxUint256CollAmount1 ? type(uint256).max : vars.collAmount1,
                maxCollShares: vars.shares
            });

            vars.executeActionCallData = executeActionCalldata(
                fluidDexWithdrawEncode(
                    address(vaults[i]),
                    sender,
                    nftId,
                    0, /* withdrawAmount */
                    vars.shareVariableData,
                    _config.wrapWithdrawnEth,
                    1 /* minCollToWithdraw - only used for max withdrawal */
                ),
                _config.isDirect
            );

            // Take snapshot before action execution.
            vars.senderCollToken0BalanceBefore = balanceOf(vaultData.supplyToken0, sender);
            vars.senderCollToken1BalanceBefore = balanceOf(vaultData.supplyToken1, sender);
            vars.senderEthBalanceBefore = address(sender).balance;
            vars.walletCollToken0BalanceBefore = balanceOf(vaultData.supplyToken0, walletAddr);
            vars.walletCollToken1BalanceBefore = balanceOf(vaultData.supplyToken1, walletAddr);
            vars.walletEthBalanceBefore = address(walletAddr).balance;
            vars.userPositionBefore = fetchPositionByNftId(nftId);

            // Execute action.
            wallet.execute(address(cut), vars.executeActionCallData, 0);
            
            // Take snapshot after action execution.
            vars.senderCollToken0BalanceAfter = balanceOf(vaultData.supplyToken0, sender);
            vars.senderCollToken1BalanceAfter = balanceOf(vaultData.supplyToken1, sender);
            vars.senderEthBalanceAfter = address(sender).balance;
            vars.walletCollToken0BalanceAfter = balanceOf(vaultData.supplyToken0, walletAddr);
            vars.walletCollToken1BalanceAfter = balanceOf(vaultData.supplyToken1, walletAddr);
            vars.walletEthBalanceAfter = address(walletAddr).balance;
            vars.userPositionAfter = fetchPositionByNftId(nftId);
            
            // Assertions.
            // Verify no dust left on wallet.
            assertEq(vars.walletCollToken0BalanceAfter, vars.walletCollToken0BalanceBefore);
            assertEq(vars.walletCollToken1BalanceAfter, vars.walletCollToken1BalanceBefore);
            assertEq(vars.walletEthBalanceAfter, vars.walletEthBalanceBefore);

            if (_config.takeMaxUint256CollAmount0) {
                assertEq(vars.userPositionAfter.isLiquidated, false);
                assertEq(vars.userPositionAfter.supply, 0);
                if (vars.isToken0Native && !_config.wrapWithdrawnEth) {
                    assertApproxEqRel(
                        vars.senderEthBalanceAfter,
                        vars.senderEthBalanceBefore + vars.collAmount0,
                        1e15 // 0.1% diff tolerance
                    );
                } else {
                    assertApproxEqRel(
                        vars.senderCollToken0BalanceAfter,
                        vars.senderCollToken0BalanceBefore + vars.collAmount0,
                        1e15 // 0.1% diff tolerance
                    );
                    assertEq(vars.senderCollToken1BalanceAfter, vars.senderCollToken1BalanceBefore);    
                }
            } else if (_config.takeMaxUint256CollAmount1) {
                assertEq(vars.userPositionAfter.isLiquidated, false);
                assertEq(vars.userPositionAfter.supply, 0);
                if (vars.isToken1Native && !_config.wrapWithdrawnEth) {
                    assertApproxEqRel(
                        vars.senderEthBalanceAfter,
                        vars.senderEthBalanceBefore + vars.collAmount1,
                        1e15 // 0.1% diff tolerance
                    );
                } else {
                    assertApproxEqRel(
                        vars.senderCollToken1BalanceAfter,
                        vars.senderCollToken1BalanceBefore + vars.collAmount1,
                        1e15 // 0.1% diff tolerance
                    );
                    assertEq(vars.senderCollToken0BalanceAfter, vars.senderCollToken0BalanceBefore);
                }
            } else {
                assertEq(vars.userPositionAfter.isLiquidated, false);
                assertTrue(vars.userPositionAfter.supply < vars.userPositionBefore.supply);

                if (vars.isToken0Native && !_config.wrapWithdrawnEth) {
                    assertEq(vars.senderEthBalanceAfter, vars.senderEthBalanceBefore + vars.collAmount0);
                } else {
                    assertEq(vars.senderCollToken0BalanceAfter, vars.senderCollToken0BalanceBefore + vars.collAmount0);
                }

                if (vars.isToken1Native && !_config.wrapWithdrawnEth) {
                    assertEq(vars.senderEthBalanceAfter, vars.senderEthBalanceBefore + vars.collAmount1);
                } else {
                    assertEq(vars.senderCollToken1BalanceAfter, vars.senderCollToken1BalanceBefore + vars.collAmount1);
                }
            }
        }
    }
}