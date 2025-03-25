// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVault } from "../../../../contracts/interfaces/fluid/vaults/IFluidVault.sol";
import { IFluidVaultT3 } from "../../../../contracts/interfaces/fluid/vaults/IFluidVaultT3.sol";
import { IFluidVaultResolver } from "../../../../contracts/interfaces/fluid/resolvers/IFluidVaultResolver.sol";
import { FluidDexOpen } from "../../../../contracts/actions/fluid/dex/FluidDexOpen.sol";
import { FluidDexModel } from "../../../../contracts/actions/fluid/helpers/FluidDexModel.sol";
import { FluidDexWithdraw } from "../../../../contracts/actions/fluid/dex/FluidDexWithdraw.sol";
import { TokenUtils } from "../../../../contracts/utils/TokenUtils.sol";
import { SmartWallet } from "../../../utils/SmartWallet.sol";
import { FluidTestBase } from "../FluidTestBase.t.sol";

contract TestFluidVaultT3Withdraw is FluidTestBase {

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
    IFluidVaultT3[] vaults;

    FluidDexOpen openContract;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new FluidDexWithdraw();
        openContract = new FluidDexOpen();

        vaults = getT3Vaults();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_withdraw_part() public {
        bool isDirect = false;
        bool takeMaxUint256 = false;
        uint256 initialSupplyAmountUSD = 50000;
        uint256 withdrawAmountUSD = 30000;
        bool wrapWithdrawnEth = false;
        _baseTest(isDirect, takeMaxUint256, initialSupplyAmountUSD, withdrawAmountUSD, wrapWithdrawnEth);
    }

    function test_should_withdraw_direct_action() public {
        bool isDirect = true;
        bool takeMaxUint256 = false;
        uint256 initialSupplyAmountUSD = 50000;
        uint256 withdrawAmountUSD = 30000;
        bool wrapWithdrawnEth = false;
        _baseTest(isDirect, takeMaxUint256, initialSupplyAmountUSD, withdrawAmountUSD, wrapWithdrawnEth);
    }

    function test_should_max_withdraw() public {
        bool isDirect = false;
        bool takeMaxUint256 = true;
        uint256 initialSupplyAmountUSD = 50000;
        uint256 withdrawAmountUSD = type(uint256).max;
        bool wrapWithdrawnEth = false;
        _baseTest(isDirect, takeMaxUint256, initialSupplyAmountUSD, withdrawAmountUSD, wrapWithdrawnEth);
    }

    function test_should_max_withdraw_with_wrapping() public {
        bool isDirect = false;
        bool takeMaxUint256 = true;
        uint256 initialSupplyAmountUSD = 50000;
        uint256 withdrawAmountUSD = type(uint256).max;
        bool wrapWithdrawnEth = true;
        _baseTest(isDirect, takeMaxUint256, initialSupplyAmountUSD, withdrawAmountUSD, wrapWithdrawnEth);
    }

    function test_should_withdraw_part_with_wrapping() public {
        bool isDirect = false;
        bool takeMaxUint256 = false;
        uint256 initialSupplyAmountUSD = 50000;
        uint256 withdrawAmountUSD = 30000;
        bool wrapWithdrawnEth = true;
        _baseTest(isDirect, takeMaxUint256, initialSupplyAmountUSD, withdrawAmountUSD, wrapWithdrawnEth);
    }
    
    function _baseTest(
        bool _isDirect,
        bool _takeMaxUint256,
        uint256 _initialSupplyAmountUSD,
        uint256 _withdrawAmountUSD,
        bool _wrapWithdrawnEth
    ) internal {
        for (uint256 i = 0; i < vaults.length; ++i) {

            uint256 nftId = executeFluidVaultT3Open(
                address(vaults[i]),
                _initialSupplyAmountUSD,
                0, /* _borrowAmount0InUSD */
                0, /* _borrowAmount1InUSD */
                wallet,
                address(openContract)
            );

            IFluidVault.ConstantViews memory constants = vaults[i].constantsView();
            bool isNativeWithdraw = constants.supplyToken.token0 == TokenUtils.ETH_ADDR;

            uint256 withdrawAmount = _takeMaxUint256
                ? type(uint256).max
                : amountInUSDPrice(
                    isNativeWithdraw ? TokenUtils.WETH_ADDR : constants.supplyToken.token0,
                    _withdrawAmountUSD
                );

            bytes memory executeActionCallData = executeActionCalldata(
                fluidDexWithdrawEncode(
                    address(vaults[i]),
                    sender,
                    nftId,
                    withdrawAmount,
                    FluidDexModel.WithdrawVariableData(0, 0, 0),
                    _wrapWithdrawnEth,
                    0 /* _minCollToWithdraw - only used for T2 and T4 vaults max withdrawal */
                ),
                _isDirect
            );

            IFluidVaultResolver.UserPosition memory userPositionBefore = fetchPositionByNftId(nftId);

            uint256 senderSupplyTokenBalanceBefore = isNativeWithdraw 
                ? (
                    _wrapWithdrawnEth ? balanceOf(TokenUtils.WETH_ADDR, sender) : address(sender).balance
                )
                : balanceOf(constants.supplyToken.token0, sender);
            uint256 walletSupplyTokenBalanceBefore = isNativeWithdraw 
                ? address(walletAddr).balance 
                : balanceOf(constants.supplyToken.token0, walletAddr);

            wallet.execute(address(cut), executeActionCallData, 0);

            uint256 senderSupplyTokenBalanceAfter = isNativeWithdraw 
                ? (
                    _wrapWithdrawnEth ? balanceOf(TokenUtils.WETH_ADDR, sender) : address(sender).balance
                )
                : balanceOf(constants.supplyToken.token0, sender);
            uint256 walletSupplyTokenBalanceAfter = isNativeWithdraw
                ? address(walletAddr).balance 
                : balanceOf(constants.supplyToken.token0, walletAddr);

            IFluidVaultResolver.UserPosition memory userPositionAfter = fetchPositionByNftId(nftId);

            assertEq(walletSupplyTokenBalanceAfter, walletSupplyTokenBalanceBefore);
            if (_takeMaxUint256) {
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