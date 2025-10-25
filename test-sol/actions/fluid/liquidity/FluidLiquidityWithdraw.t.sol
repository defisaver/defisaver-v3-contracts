// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    IFluidVaultResolver
} from "../../../../contracts/interfaces/protocols/fluid/resolvers/IFluidVaultResolver.sol";
import { FluidVaultT1Open } from "../../../../contracts/actions/fluid/vaultT1/FluidVaultT1Open.sol";
import { FluidDexOpen } from "../../../../contracts/actions/fluid/dex/FluidDexOpen.sol";
import { FluidVaultT1Withdraw } from "../../../../contracts/actions/fluid/vaultT1/FluidVaultT1Withdraw.sol";
import { FluidDexWithdraw } from "../../../../contracts/actions/fluid/dex/FluidDexWithdraw.sol";
import { FluidDexModel } from "../../../../contracts/actions/fluid/helpers/FluidDexModel.sol";
import { TokenUtils } from "../../../../contracts/utils/token/TokenUtils.sol";
import { SmartWallet } from "../../../utils/SmartWallet.sol";
import { FluidTestBase } from "../FluidTestBase.t.sol";

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

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("FluidLiquidityWithdraw");

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

        for (uint256 i = 0; i < vaults.length; ++i) {
            uint256 nftId = _t1VaultsSelected
                ? executeFluidVaultT1Open(
                    address(vaults[i]), _config.initialSupplyAmountUSD, 0, wallet, address(t1OpenContract)
                )
                : executeFluidVaultT3Open(
                    address(vaults[i]),
                    _config.initialSupplyAmountUSD,
                    0, /* _borrowAmount0InUSD */
                    0, /* _borrowAmount1InUSD */
                    wallet,
                    address(t3OpenContract)
                );

            if (!_t1VaultsSelected && nftId == 0) {
                logSkipTestBecauseOfOpen(vaults[i]);
                continue;
            }

            FluidTestBase.TokensData memory tokens = getTokens(vaults[i], _t1VaultsSelected);
            bool isNativeWithdraw =
                _t1VaultsSelected ? tokens.supply0 == TokenUtils.ETH_ADDR : tokens.supply0 == TokenUtils.ETH_ADDR;

            uint256 withdrawAmount = _config.takeMaxUint256
                ? type(uint256).max
                : amountInUSDPrice(isNativeWithdraw ? TokenUtils.WETH_ADDR : tokens.supply0, _config.withdrawAmountUSD);

            bytes memory executeActionCallData = executeActionCalldata(
                _t1VaultsSelected
                    ? fluidVaultT1WithdrawEncode(
                        address(vaults[i]), nftId, withdrawAmount, sender, _config.wrapWithdrawnEth
                    )
                    : fluidDexWithdrawEncode(
                        address(vaults[i]),
                        sender,
                        nftId,
                        withdrawAmount,
                        FluidDexModel.WithdrawVariableData(0, 0, 0, 0),
                        _config.wrapWithdrawnEth
                    ),
                _config.isDirect
            );

            IFluidVaultResolver.UserPosition memory userPositionBefore = fetchPositionByNftId(nftId);

            uint256 senderSupplyTokenBalanceBefore = isNativeWithdraw
                ? (_config.wrapWithdrawnEth ? balanceOf(TokenUtils.WETH_ADDR, sender) : address(sender).balance)
                : balanceOf(tokens.supply0, sender);
            uint256 walletSupplyTokenBalanceBefore =
                isNativeWithdraw ? address(walletAddr).balance : balanceOf(tokens.supply0, walletAddr);

            wallet.execute(
                _t1VaultsSelected ? address(cut_FluidVaultT1Withdraw) : address(cut_FluidDexWithdraw),
                executeActionCallData,
                0
            );

            uint256 senderSupplyTokenBalanceAfter = isNativeWithdraw
                ? (_config.wrapWithdrawnEth ? balanceOf(TokenUtils.WETH_ADDR, sender) : address(sender).balance)
                : balanceOf(tokens.supply0, sender);
            uint256 walletSupplyTokenBalanceAfter =
                isNativeWithdraw ? address(walletAddr).balance : balanceOf(tokens.supply0, walletAddr);

            IFluidVaultResolver.UserPosition memory userPositionAfter = fetchPositionByNftId(nftId);

            assertEq(walletSupplyTokenBalanceAfter, walletSupplyTokenBalanceBefore);
            if (_config.takeMaxUint256) {
                assertApproxEqRel(
                    senderSupplyTokenBalanceAfter,
                    senderSupplyTokenBalanceBefore + userPositionBefore.supply,
                    1e15 // 0.1% diff tolerance
                );
                assertEq(userPositionAfter.supply, 0);
            } else {
                assertEq(senderSupplyTokenBalanceAfter, senderSupplyTokenBalanceBefore + withdrawAmount);
                assertApproxEqRel(
                    userPositionAfter.supply,
                    userPositionBefore.supply - withdrawAmount,
                    1e15 // 0.1% diff tolerance
                );
            }
        }
    }
}
