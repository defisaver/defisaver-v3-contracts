// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    IFluidVaultResolver
} from "../../../../contracts/interfaces/protocols/fluid/resolvers/IFluidVaultResolver.sol";
import { FluidVaultT1Open } from "../../../../contracts/actions/fluid/vaultT1/FluidVaultT1Open.sol";
import { FluidDexOpen } from "../../../../contracts/actions/fluid/dex/FluidDexOpen.sol";
import {
    FluidVaultT1Withdraw
} from "../../../../contracts/actions/fluid/vaultT1/FluidVaultT1Withdraw.sol";
import { FluidDexWithdraw } from "../../../../contracts/actions/fluid/dex/FluidDexWithdraw.sol";
import { FluidDexModel } from "../../../../contracts/actions/fluid/helpers/FluidDexModel.sol";
import { TokenUtils } from "../../../../contracts/utils/token/TokenUtils.sol";
import { SmartWallet } from "../../../utils/SmartWallet.sol";
import { FluidTestBase } from "../FluidTestBase.t.sol";
import { FluidEncode } from "../../../utils/encode/FluidEncode.sol";

contract TestFluidLiquidityWithdraw is FluidTestBase {
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    FluidVaultT1Withdraw cut_FluidVaultT1Withdraw;
    FluidDexWithdraw cut_FluidDexWithdraw;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/

    SmartWallet wallet;
    address sender;
    address walletAddr;

    address[] t1Vaults;
    address[] t3Vaults;

    FluidVaultT1Open t1OpenContract;
    FluidDexOpen t3OpenContract;

    bool[] t1VaultsSelected;

    struct TestConfig {
        bool isDirect;
        bool takeMaxUint256;
        uint256 initialSupplyAmountUSD;
        uint256 withdrawAmountUSD;
        bool wrapWithdrawnEth;
    }

    struct FluidLiquidityWithdrawLocalVars {
        uint256 withdrawAmount;
        bool isNativeWithdraw;
        bytes executeActionCallData;
        uint256 senderSupplyTokenBalanceBefore;
        uint256 senderSupplyTokenBalanceAfter;
        uint256 walletSupplyTokenBalanceBefore;
        uint256 walletSupplyTokenBalanceAfter;
        IFluidVaultResolver.UserPosition userPositionBefore;
        IFluidVaultResolver.UserPosition userPositionAfter;
        uint256 nftId;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("FluidLiquidityWithdraw");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut_FluidVaultT1Withdraw = new FluidVaultT1Withdraw();
        cut_FluidDexWithdraw = new FluidDexWithdraw();

        t1OpenContract = new FluidVaultT1Open();
        t3OpenContract = new FluidDexOpen();

        t1Vaults = getT1Vaults();
        t3Vaults = getT3Vaults();

        t1VaultsSelected = new bool[](2);
        t1VaultsSelected[0] = true;
        t1VaultsSelected[1] = false;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_withdraw_part() public {
        for (uint256 i = 0; i < t1VaultsSelected.length; ++i) {
            _baseTest(
                TestConfig({
                    isDirect: false,
                    takeMaxUint256: false,
                    initialSupplyAmountUSD: 50_000,
                    withdrawAmountUSD: 30_000,
                    wrapWithdrawnEth: false
                }),
                t1VaultsSelected[i]
            );
        }
    }

    function test_should_withdraw_direct_action() public {
        for (uint256 i = 0; i < t1VaultsSelected.length; ++i) {
            _baseTest(
                TestConfig({
                    isDirect: true,
                    takeMaxUint256: false,
                    initialSupplyAmountUSD: 50_000,
                    withdrawAmountUSD: 30_000,
                    wrapWithdrawnEth: false
                }),
                t1VaultsSelected[i]
            );
        }
    }

    function test_should_max_withdraw() public {
        for (uint256 i = 0; i < t1VaultsSelected.length; ++i) {
            _baseTest(
                TestConfig({
                    isDirect: false,
                    takeMaxUint256: true,
                    initialSupplyAmountUSD: 50_000,
                    withdrawAmountUSD: type(uint256).max,
                    wrapWithdrawnEth: false
                }),
                t1VaultsSelected[i]
            );
        }
    }

    function test_should_max_withdraw_with_wrapping() public {
        for (uint256 i = 0; i < t1VaultsSelected.length; ++i) {
            _baseTest(
                TestConfig({
                    isDirect: false,
                    takeMaxUint256: true,
                    initialSupplyAmountUSD: 50_000,
                    withdrawAmountUSD: type(uint256).max,
                    wrapWithdrawnEth: true
                }),
                t1VaultsSelected[i]
            );
        }
    }

    function test_should_withdraw_part_with_wrapping() public {
        for (uint256 i = 0; i < t1VaultsSelected.length; ++i) {
            _baseTest(
                TestConfig({
                    isDirect: false,
                    takeMaxUint256: false,
                    initialSupplyAmountUSD: 50_000,
                    withdrawAmountUSD: 30_000,
                    wrapWithdrawnEth: true
                }),
                t1VaultsSelected[i]
            );
        }
    }

    function _baseTest(TestConfig memory _config, bool _t1VaultsSelected) internal {
        address[] memory vaults = _t1VaultsSelected ? t1Vaults : t3Vaults;

        FluidLiquidityWithdrawLocalVars memory vars;

        for (uint256 i = 0; i < vaults.length; ++i) {
            if (isMissingVault(vaults[i])) {
                logVaultNotFound(vaults[i]);
                continue;
            }
            vars.nftId = _t1VaultsSelected
                ? executeFluidVaultT1Open(
                    address(vaults[i]),
                    _config.initialSupplyAmountUSD,
                    0,
                    wallet,
                    address(t1OpenContract)
                )
                : executeFluidVaultT3Open(
                    address(vaults[i]),
                    _config.initialSupplyAmountUSD,
                    0, /* _borrowAmount0InUSD */
                    0, /* _borrowAmount1InUSD */
                    wallet,
                    address(t3OpenContract)
                );

            if (!_t1VaultsSelected && vars.nftId == 0) {
                logSkipTestBecauseOfOpen(vaults[i]);
                continue;
            }

            FluidTestBase.TokensData memory tokens = getTokens(vaults[i], _t1VaultsSelected);
            vars.isNativeWithdraw = _t1VaultsSelected
                ? tokens.supply0 == TokenUtils.ETH_ADDR
                : tokens.supply0 == TokenUtils.ETH_ADDR;

            vars.withdrawAmount = _config.takeMaxUint256
                ? type(uint256).max
                : amountInUSDPrice(
                    vars.isNativeWithdraw ? TokenUtils.WETH_ADDR : tokens.supply0,
                    _config.withdrawAmountUSD
                );

            vars.executeActionCallData = executeActionCalldata(
                _t1VaultsSelected
                    ? FluidEncode.vaultT1Withdraw(
                        address(vaults[i]),
                        vars.nftId,
                        vars.withdrawAmount,
                        sender,
                        _config.wrapWithdrawnEth
                    )
                    : FluidEncode.dexWithdraw(
                        address(vaults[i]),
                        sender,
                        vars.nftId,
                        vars.withdrawAmount,
                        FluidDexModel.WithdrawVariableData(0, 0, 0, 0),
                        _config.wrapWithdrawnEth
                    ),
                _config.isDirect
            );

            vars.userPositionBefore = fetchPositionByNftId(vars.nftId);

            vars.senderSupplyTokenBalanceBefore = vars.isNativeWithdraw
                ? (_config.wrapWithdrawnEth
                        ? balanceOf(TokenUtils.WETH_ADDR, sender)
                        : address(sender).balance)
                : balanceOf(tokens.supply0, sender);
            vars.walletSupplyTokenBalanceBefore = vars.isNativeWithdraw
                ? address(walletAddr).balance
                : balanceOf(tokens.supply0, walletAddr);

            wallet.execute(
                _t1VaultsSelected
                    ? address(cut_FluidVaultT1Withdraw)
                    : address(cut_FluidDexWithdraw),
                vars.executeActionCallData,
                0
            );

            vars.senderSupplyTokenBalanceAfter = vars.isNativeWithdraw
                ? (_config.wrapWithdrawnEth
                        ? balanceOf(TokenUtils.WETH_ADDR, sender)
                        : address(sender).balance)
                : balanceOf(tokens.supply0, sender);
            vars.walletSupplyTokenBalanceAfter = vars.isNativeWithdraw
                ? address(walletAddr).balance
                : balanceOf(tokens.supply0, walletAddr);

            vars.userPositionAfter = fetchPositionByNftId(vars.nftId);

            assertEq(vars.walletSupplyTokenBalanceAfter, vars.walletSupplyTokenBalanceBefore);
            if (_config.takeMaxUint256) {
                assertApproxEqRel(
                    vars.senderSupplyTokenBalanceAfter,
                    vars.senderSupplyTokenBalanceBefore + vars.userPositionBefore.supply,
                    1e15 // 0.1% diff tolerance
                );
                assertEq(vars.userPositionAfter.supply, 0);
            } else {
                assertEq(
                    vars.senderSupplyTokenBalanceAfter,
                    vars.senderSupplyTokenBalanceBefore + vars.withdrawAmount
                );
                assertApproxEqRel(
                    vars.userPositionAfter.supply,
                    vars.userPositionBefore.supply - vars.withdrawAmount,
                    1e15 // 0.1% diff tolerance
                );
            }
        }
    }
}
