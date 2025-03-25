// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVaultT2 } from "../../../../contracts/interfaces/fluid/vaults/IFluidVaultT2.sol";
import { IFluidVaultResolver } from "../../../../contracts/interfaces/fluid/resolvers/IFluidVaultResolver.sol";
import { FluidView } from "../../../../contracts/views/FluidView.sol";
import { FluidDexOpen } from "../../../../contracts/actions/fluid/dex/FluidDexOpen.sol";
import { FluidDexBorrow } from "../../../../contracts/actions/fluid/dex/FluidDexBorrow.sol";
import { FluidDexModel } from "../../../../contracts/actions/fluid/helpers/FluidDexModel.sol";
import { TokenUtils } from "../../../../contracts/utils/TokenUtils.sol";
import { FluidTestBase } from "../FluidTestBase.t.sol";
import { SmartWallet } from "../../../utils/SmartWallet.sol";

contract TestFluidVaultT2Borrow is FluidTestBase {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    FluidDexBorrow cut;

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

        cut = new FluidDexBorrow();
        openContract = new FluidDexOpen();

        vaults = getT2Vaults();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_borrow() public {
        bool isDirect = false;
        uint256 borrowAmountUSD = 30000;
        bool wrapBorrowedEth = false;
        _baseTest(isDirect, borrowAmountUSD, wrapBorrowedEth);
    }

    function test_should_borrow_action_direct() public {
        bool isDirect = true;
        uint256 borrowAmountUSD = 30000;
        bool wrapBorrowedEth = false;
        _baseTest(isDirect, borrowAmountUSD, wrapBorrowedEth);
    }

    function test_should_borrow_with_eth_wrap() public {
        bool isDirect = false;
        uint256 borrowAmountUSD = 30000;
        bool wrapBorrowedEth = true;
        _baseTest(isDirect, borrowAmountUSD, wrapBorrowedEth);
    }

    function _baseTest(
        bool _isDirect,
        uint256 _borrowAmountUSD,
        bool _wrapBorrowedEth
    ) internal {
        for (uint256 i = 0; i < vaults.length; ++i) {
            uint256 nftId = executeFluidVaultT2Open(
                address(vaults[i]),
                60000, /* initial coll amount 0 in usd */
                10000, /* initial coll amount 1 in usd */
                0, /* initial borrow amount in usd */
                wallet,
                address(openContract)
            );

            if (nftId == 0) {
                emit log_named_address("Skipping test: Could't open fluid position for vault:", address(vaults[i]));
                continue;
            }

            IFluidVaultT2.ConstantViews memory constants = vaults[i].constantsView();
            bool isNativeBorrow = constants.borrowToken.token0 == TokenUtils.ETH_ADDR;
            uint256 borrowAmount = amountInUSDPrice(
                isNativeBorrow ? TokenUtils.WETH_ADDR : constants.borrowToken.token0,
                _borrowAmountUSD
            );
            emit log_named_uint("borrowAmount", borrowAmount);

            bytes memory executeActionCallData = executeActionCalldata(
                fluidDexBorrowEncode(
                    address(vaults[i]),
                    sender,
                    nftId,
                    borrowAmount,
                    FluidDexModel.BorrowVariableData(0, 0, 0),
                    _wrapBorrowedEth
                ),
                _isDirect
            );

            IFluidVaultResolver.UserPosition memory userPositionBefore = fetchPositionByNftId(nftId);

            uint256 senderBorrowTokenBalanceBefore = isNativeBorrow 
                ? (
                    _wrapBorrowedEth ? balanceOf(TokenUtils.WETH_ADDR, sender) : address(sender).balance
                )
                : balanceOf(constants.borrowToken.token0, sender);

            uint256 walletBorrowTokenBalanceBefore = isNativeBorrow 
                ? address(walletAddr).balance 
                : balanceOf(constants.borrowToken.token0, walletAddr);

            wallet.execute(address(cut), executeActionCallData, 0);

            uint256 senderBorrowTokenBalanceAfter = isNativeBorrow 
                ? (
                    _wrapBorrowedEth ? balanceOf(TokenUtils.WETH_ADDR, sender) : address(sender).balance
                ) 
                : balanceOf(constants.borrowToken.token0, sender);

            uint256 walletBorrowTokenBalanceAfter = isNativeBorrow 
                ? address(walletAddr).balance 
                : balanceOf(constants.borrowToken.token0, walletAddr);

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