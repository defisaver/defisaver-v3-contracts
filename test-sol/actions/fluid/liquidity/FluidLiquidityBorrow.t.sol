// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    IFluidVaultResolver
} from "../../../../contracts/interfaces/protocols/fluid/resolvers/IFluidVaultResolver.sol";
import { FluidVaultT1Open } from "../../../../contracts/actions/fluid/vaultT1/FluidVaultT1Open.sol";
import { FluidDexOpen } from "../../../../contracts/actions/fluid/dex/FluidDexOpen.sol";
import { FluidDexModel } from "../../../../contracts/actions/fluid/helpers/FluidDexModel.sol";
import {
    FluidVaultT1Borrow
} from "../../../../contracts/actions/fluid/vaultT1/FluidVaultT1Borrow.sol";
import { FluidDexBorrow } from "../../../../contracts/actions/fluid/dex/FluidDexBorrow.sol";
import { TokenUtils } from "../../../../contracts/utils/token/TokenUtils.sol";
import { FluidTestBase } from "../FluidTestBase.t.sol";
import { SmartWallet } from "../../../utils/SmartWallet.sol";
import { FluidEncode } from "../../../utils/encode/FluidEncode.sol";

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

    struct FluidLiquidityBorrowLocalVars {
        uint256 borrowAmount;
        bool isNativeBorrow;
        bytes executeActionCallData;
        uint256 senderBorrowTokenBalanceBefore;
        uint256 senderBorrowTokenBalanceAfter;
        uint256 walletBorrowTokenBalanceBefore;
        uint256 walletBorrowTokenBalanceAfter;
        IFluidVaultResolver.UserPosition userPositionBefore;
        IFluidVaultResolver.UserPosition userPositionAfter;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("FluidLiquidityBorrow");

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
            if (isMissingVault(vaults[i])) {
                logVaultNotFound(vaults[i]);
                continue;
            }
            uint256 nftId = _t1VaultsSelected
                ? executeFluidVaultT1Open(
                    vaults[i], _initialSupplyAmountUSD, 0, wallet, address(t1OpenContract)
                )
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

            FluidLiquidityBorrowLocalVars memory vars;

            vars.isNativeBorrow = tokens.borrow0 == TokenUtils.ETH_ADDR;
            vars.borrowAmount = amountInUSDPrice(
                vars.isNativeBorrow ? TokenUtils.WETH_ADDR : tokens.borrow0, _borrowAmountUSD
            );

            vars.executeActionCallData = executeActionCalldata(
                _t1VaultsSelected
                    ? FluidEncode.vaultT1Borrow(
                        vaults[i], nftId, vars.borrowAmount, sender, _wrapBorrowedEth
                    )
                    : FluidEncode.dexBorrow(
                        vaults[i],
                        sender,
                        nftId,
                        vars.borrowAmount,
                        FluidDexModel.BorrowVariableData(0, 0, 0),
                        _wrapBorrowedEth
                    ),
                _isDirect
            );

            vars.userPositionBefore = fetchPositionByNftId(nftId);

            vars.senderBorrowTokenBalanceBefore = vars.isNativeBorrow
                ? (_wrapBorrowedEth
                        ? balanceOf(TokenUtils.WETH_ADDR, sender)
                        : address(sender).balance)
                : balanceOf(tokens.borrow0, sender);

            vars.walletBorrowTokenBalanceBefore = vars.isNativeBorrow
                ? address(walletAddr).balance
                : balanceOf(tokens.borrow0, walletAddr);

            wallet.execute(
                _t1VaultsSelected ? address(cut_FluidVaultT1Borrow) : address(cut_FluidDexBorrow),
                vars.executeActionCallData,
                0
            );

            vars.senderBorrowTokenBalanceAfter = vars.isNativeBorrow
                ? (_wrapBorrowedEth
                        ? balanceOf(TokenUtils.WETH_ADDR, sender)
                        : address(sender).balance)
                : balanceOf(tokens.borrow0, sender);

            vars.walletBorrowTokenBalanceAfter = vars.isNativeBorrow
                ? address(walletAddr).balance
                : balanceOf(tokens.borrow0, walletAddr);

            vars.userPositionAfter = fetchPositionByNftId(nftId);

            assertEq(vars.walletBorrowTokenBalanceAfter, vars.walletBorrowTokenBalanceBefore);
            assertEq(
                vars.senderBorrowTokenBalanceAfter,
                vars.senderBorrowTokenBalanceBefore + vars.borrowAmount
            );
            assertEq(vars.userPositionBefore.borrow, 0);
            assertApproxEqRel(
                vars.userPositionAfter.borrow,
                vars.borrowAmount,
                1e15 // 0.1% tolerance
            );
        }
    }
}
