// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVaultT1 } from "../../../../contracts/interfaces/fluid/vaults/IFluidVaultT1.sol";
import { IFluidVaultResolver } from "../../../../contracts/interfaces/fluid/resolvers/IFluidVaultResolver.sol";
import { FluidVaultT1Open } from "../../../../contracts/actions/fluid/vaultT1/FluidVaultT1Open.sol";
import { FluidTestBase } from "../FluidTestBase.t.sol";
import { SmartWallet } from "../../../utils/SmartWallet.sol";
import { TokenUtils } from "../../../../contracts/utils/TokenUtils.sol";
import { Vm } from "forge-std/Vm.sol";

contract TestFluidLiquidityOpen is FluidTestBase {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    FluidVaultT1Open cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/

    SmartWallet wallet;
    address sender;
    address walletAddr;
    address[] vaults;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("FluidOpenLiquidity");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new FluidVaultT1Open();

        vaults = getT1Vaults();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_open_position() public {
        bool isDirect = false;
        bool takeMaxUint256 = false;
        uint256 collateralAmountInUSD = 30000;
        uint256 borrowAmountInUSD = 10000;
        bool wrapBorrowedEth = false;
        _baseTest(isDirect, takeMaxUint256, collateralAmountInUSD, borrowAmountInUSD, wrapBorrowedEth);
    }

    function test_should_open_position_direct_action() public {
        bool isDirect = true;
        bool takeMaxUint256 = false;
        uint256 collateralAmountInUSD = 30000;
        uint256 borrowAmountInUSD = 10000;
        bool wrapBorrowedEth = false;
        _baseTest(isDirect, takeMaxUint256, collateralAmountInUSD, borrowAmountInUSD, wrapBorrowedEth);
    }

    function test_should_open_position_with_maxUint256() public {
        bool isDirect = false;
        bool takeMaxUint256 = true;
        uint256 collateralAmountInUSD = 30000;
        uint256 borrowAmountInUSD = 10000;
        bool wrapBorrowedEth = false;
        _baseTest(isDirect, takeMaxUint256, collateralAmountInUSD, borrowAmountInUSD, wrapBorrowedEth);
    }

    function test_should_open_only_supply_position() public {
        bool isDirect = false;
        bool takeMaxUint256 = false;
        uint256 collateralAmountInUSD = 30000;
        uint256 borrowAmountInUSD = 0;
        bool wrapBorrowedEth = false;
        _baseTest(isDirect, takeMaxUint256, collateralAmountInUSD, borrowAmountInUSD, wrapBorrowedEth);
    }

    function test_should_open_position_with_borrow_eth_wrap() public {
        bool isDirect = false;
        bool takeMaxUint256 = false;
        uint256 collateralAmountInUSD = 30000;
        uint256 borrowAmountInUSD = 10000;
        bool wrapBorrowedEth = true;
        _baseTest(isDirect, takeMaxUint256, collateralAmountInUSD, borrowAmountInUSD, wrapBorrowedEth);
    }

    function _baseTest(
        bool isDirect,
        bool takeMaxUint256,
        uint256 collateralAmountInUSD,
        uint256 borrowAmountInUSD,
        bool wrapBorrowedEth
    ) internal {
        for (uint256 i = 0; i < vaults.length; ++i) {
            IFluidVaultT1.ConstantViews memory constants = IFluidVaultT1(vaults[i]).constantsView();
            bool isNativeSupply = constants.supplyToken == TokenUtils.ETH_ADDR;
            bool isNativeBorrow = constants.borrowToken == TokenUtils.ETH_ADDR;

            constants.supplyToken = isNativeSupply ? TokenUtils.WETH_ADDR : constants.supplyToken;
            uint256 supplyAmount = amountInUSDPrice(constants.supplyToken, collateralAmountInUSD);
            give(constants.supplyToken, sender, supplyAmount);
            approveAsSender(sender, constants.supplyToken, walletAddr, supplyAmount);    

            uint256 borrowAmount = borrowAmountInUSD != 0
                ? amountInUSDPrice(isNativeBorrow ? TokenUtils.WETH_ADDR : constants.borrowToken, borrowAmountInUSD)
                : 0;

            bytes memory executeActionCallData = executeActionCalldata(
                fluidVaultT1OpenEncode(
                    vaults[i],
                    takeMaxUint256 ? type(uint256).max : supplyAmount,
                    borrowAmount,
                    sender,
                    sender,
                    wrapBorrowedEth
                ),
                isDirect
            );

            uint256 senderSupplyTokenBalanceBefore = balanceOf(constants.supplyToken, sender);
            uint256 senderBorrowTokenBalanceBefore = isNativeBorrow 
                ? (
                    wrapBorrowedEth? balanceOf(TokenUtils.WETH_ADDR, sender) : address(sender).balance
                )
                : balanceOf(constants.borrowToken, sender);

            vm.recordLogs();
            wallet.execute(address(cut), executeActionCallData, 0);
            Vm.Log[] memory logs = vm.getRecordedLogs();
            uint256 createdNft = getNftIdFromLogs(logs);
            assertFalse(createdNft == 0);

            uint256 senderSupplyTokenBalanceAfter = balanceOf(constants.supplyToken, sender);
            uint256 senderBorrowTokenBalanceAfter = isNativeBorrow 
                ? (
                    wrapBorrowedEth ? balanceOf(TokenUtils.WETH_ADDR, sender) : address(sender).balance 
                ) 
                : balanceOf(constants.borrowToken, sender);

            assertEq(senderSupplyTokenBalanceAfter, senderSupplyTokenBalanceBefore - supplyAmount);
            assertEq(senderBorrowTokenBalanceAfter, senderBorrowTokenBalanceBefore + borrowAmount);

            IFluidVaultResolver.UserPosition memory userPosition = fetchPositionByNftId(createdNft);

            assertEq(userPosition.owner, walletAddr);
            assertEq(userPosition.isLiquidated, false);
            assertEq(userPosition.isSupplyPosition, borrowAmount == 0);

            _logData(supplyAmount, borrowAmount, userPosition);
        }
    }

    function _logData(
        uint256 supplyAmount,
        uint256 borrowAmount,
        IFluidVaultResolver.UserPosition memory userPosition
    ) internal {
        emit log_named_uint("supplyAmount", supplyAmount);
        emit log_named_uint("borrowAmount", borrowAmount);
        emit log_named_address("owner", userPosition.owner);
        emit log_named_uint("isLiquidated", uint256(userPosition.isLiquidated ? 1 : 0));
        emit log_named_uint("isSupplyPosition", uint256(userPosition.isSupplyPosition ? 1 : 0));
        emit log_named_int("tick", userPosition.tick);
        emit log_named_uint("tickId", userPosition.tickId);
        emit log_named_uint("beforeSupply", userPosition.beforeSupply);
        emit log_named_uint("beforeBorrow", userPosition.beforeBorrow);
        emit log_named_uint("beforeDustBorrow", userPosition.beforeDustBorrow);
        emit log_named_uint("supply", userPosition.supply);
        emit log_named_uint("borrow", userPosition.borrow);
        emit log_named_uint("dustBorrow", userPosition.dustBorrow);
    }
}