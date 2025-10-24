// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVaultResolver } from "../../../../contracts/interfaces/fluid/resolvers/IFluidVaultResolver.sol";
import { FluidVaultT1Open } from "../../../../contracts/actions/fluid/vaultT1/FluidVaultT1Open.sol";
import { FluidDexOpen } from "../../../../contracts/actions/fluid/dex/FluidDexOpen.sol";
import { FluidDexModel } from "../../../../contracts/actions/fluid/helpers/FluidDexModel.sol";
import { FluidVaultT1Borrow } from "../../../../contracts/actions/fluid/vaultT1/FluidVaultT1Borrow.sol";
import { FluidDexBorrow } from "../../../../contracts/actions/fluid/dex/FluidDexBorrow.sol";
import { TokenUtils } from "../../../../contracts/utils/TokenUtils.sol";
import { FluidTestBase } from "../FluidTestBase.t.sol";
import { SmartWallet } from "../../../utils/SmartWallet.sol";

contract TestFluidLiquidityBorrow is FluidTestBase {
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACTS UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    FluidVaultT1Borrow cut_FluidVaultT1Borrow;
    FluidDexBorrow cut_FluidDexBorrow;

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

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("FluidLiquidityBorrow");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut_FluidVaultT1Borrow = new FluidVaultT1Borrow();
        cut_FluidDexBorrow = new FluidDexBorrow();

        t1OpenContract = new FluidVaultT1Open();
        t2OpenContract = new FluidDexOpen();

        t1Vaults = getT1Vaults();
        t2Vaults = getT2Vaults();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_borrow() public {
        bool isDirect = false;
        uint256 initialSupplyAmountUSD = 50_000;
        uint256 borrowAmountUSD = 30_000;
        bool wrapBorrowedEth = false;

        _baseTest(isDirect, initialSupplyAmountUSD, borrowAmountUSD, wrapBorrowedEth, true);
        _baseTest(isDirect, initialSupplyAmountUSD, borrowAmountUSD, wrapBorrowedEth, false);
    }

    function test_should_borrow_action_direct() public {
        bool isDirect = true;
        uint256 initialSupplyAmountUSD = 50_000;
        uint256 borrowAmountUSD = 30_000;
        bool wrapBorrowedEth = false;

        _baseTest(isDirect, initialSupplyAmountUSD, borrowAmountUSD, wrapBorrowedEth, true);
        _baseTest(isDirect, initialSupplyAmountUSD, borrowAmountUSD, wrapBorrowedEth, false);
    }

    function test_should_borrow_with_eth_wrap() public {
        bool isDirect = false;
        uint256 initialSupplyAmountUSD = 50_000;
        uint256 borrowAmountUSD = 30_000;
        bool wrapBorrowedEth = true;

        _baseTest(isDirect, initialSupplyAmountUSD, borrowAmountUSD, wrapBorrowedEth, true);
        _baseTest(isDirect, initialSupplyAmountUSD, borrowAmountUSD, wrapBorrowedEth, false);
    }

    function _baseTest(
        bool _isDirect,
        uint256 _initialSupplyAmountUSD,
        uint256 _borrowAmountUSD,
        bool _wrapBorrowedEth,
        bool _t1VaultsSelected
    ) internal {
        address[] memory vaults = _t1VaultsSelected ? t1Vaults : t2Vaults;

        for (uint256 i = 0; i < vaults.length; ++i) {
            uint256 nftId = _t1VaultsSelected
                ? executeFluidVaultT1Open(vaults[i], _initialSupplyAmountUSD, 0, wallet, address(t1OpenContract))
                : executeFluidVaultT2Open(
                    vaults[i],
                    _initialSupplyAmountUSD, /* initial coll amount 0 in usd */
                    0, /* initial coll amount 1 in usd */
                    0, /* initial borrow amount in usd */
                    wallet,
                    address(t2OpenContract)
                );

            if (!_t1VaultsSelected && nftId == 0) {
                logSkipTestBecauseOfOpen(vaults[i]);
                continue;
            }

            FluidTestBase.TokensData memory tokens = getTokens(vaults[i], _t1VaultsSelected);

            bool isNativeBorrow = tokens.borrow0 == TokenUtils.ETH_ADDR;
            uint256 borrowAmount =
                amountInUSDPrice(isNativeBorrow ? TokenUtils.WETH_ADDR : tokens.borrow0, _borrowAmountUSD);

            bytes memory executeActionCallData = executeActionCalldata(
                _t1VaultsSelected
                    ? fluidVaultT1BorrowEncode(vaults[i], nftId, borrowAmount, sender, _wrapBorrowedEth)
                    : fluidDexBorrowEncode(
                        vaults[i], sender, nftId, borrowAmount, FluidDexModel.BorrowVariableData(0, 0, 0), _wrapBorrowedEth
                    ),
                _isDirect
            );

            IFluidVaultResolver.UserPosition memory userPositionBefore = fetchPositionByNftId(nftId);

            uint256 senderBorrowTokenBalanceBefore = isNativeBorrow
                ? (_wrapBorrowedEth ? balanceOf(TokenUtils.WETH_ADDR, sender) : address(sender).balance)
                : balanceOf(tokens.borrow0, sender);

            uint256 walletBorrowTokenBalanceBefore =
                isNativeBorrow ? address(walletAddr).balance : balanceOf(tokens.borrow0, walletAddr);

            wallet.execute(
                _t1VaultsSelected ? address(cut_FluidVaultT1Borrow) : address(cut_FluidDexBorrow),
                executeActionCallData,
                0
            );

            uint256 senderBorrowTokenBalanceAfter = isNativeBorrow
                ? (_wrapBorrowedEth ? balanceOf(TokenUtils.WETH_ADDR, sender) : address(sender).balance)
                : balanceOf(tokens.borrow0, sender);

            uint256 walletBorrowTokenBalanceAfter =
                isNativeBorrow ? address(walletAddr).balance : balanceOf(tokens.borrow0, walletAddr);

            IFluidVaultResolver.UserPosition memory userPositionAfter = fetchPositionByNftId(nftId);

            assertEq(walletBorrowTokenBalanceAfter, walletBorrowTokenBalanceBefore);
            assertEq(senderBorrowTokenBalanceAfter, senderBorrowTokenBalanceBefore + borrowAmount);
            assertEq(userPositionBefore.borrow, 0);
            assertApproxEqRel(
                userPositionAfter.borrow,
                borrowAmount,
                1e15 // 0.1% tolerance
            );
        }
    }
}
