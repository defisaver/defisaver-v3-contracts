// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVaultT3 } from "../../../../contracts/interfaces/fluid/vaults/IFluidVaultT3.sol";
import { IFluidVaultResolver } from "../../../../contracts/interfaces/fluid/resolvers/IFluidVaultResolver.sol";
import { FluidView } from "../../../../contracts/views/FluidView.sol";
import { FluidDexOpen } from "../../../../contracts/actions/fluid/dex/FluidDexOpen.sol";
import { FluidDexBorrow } from "../../../../contracts/actions/fluid/dex/FluidDexBorrow.sol";
import { FluidDexModel } from "../../../../contracts/actions/fluid/helpers/FluidDexModel.sol";
import { TokenUtils } from "../../../../contracts/utils/TokenUtils.sol";
import { FluidTestBase } from "../FluidTestBase.t.sol";
import { SmartWallet } from "../../../utils/SmartWallet.sol";

contract TestFluidDexBorrow is FluidTestBase {
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

    address[] t3Vaults;
    address[] t4Vaults;

    FluidDexOpen openContract;

    bool[] t3VaultsSelected;

    struct TestConfig {
        bool isDirect;
        bool wrapBorrowedEth;
        uint256 borrowAmount0InUSD;
        uint256 borrowAmount1InUSD;
    }

    struct LocalVars {
        uint256 borrowAmount0;
        uint256 borrowAmount1;
        bool isNativeBorrow0;
        bool isNativeBorrow1;
        uint256 shares;
        bytes executeActionCallData;
        uint256 senderBorrowToken0BalanceBefore;
        uint256 senderBorrowToken1BalanceBefore;
        uint256 senderBorrowToken0BalanceAfter;
        uint256 senderBorrowToken1BalanceAfter;
        uint256 walletEthBalanceBefore;
        uint256 walletBorrowToken0BalanceBefore;
        uint256 walletBorrowToken1BalanceBefore;
        uint256 walletEthBalanceAfter;
        uint256 walletBorrowToken0BalanceAfter;
        uint256 walletBorrowToken1BalanceAfter;
        IFluidVaultResolver.UserPosition userPositionBefore;
        IFluidVaultResolver.UserPosition userPositionAfter;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("FluidDexBorrow");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new FluidDexBorrow();
        openContract = new FluidDexOpen();

        t3Vaults = getT3Vaults();
        t4Vaults = getT4Vaults();

        t3VaultsSelected = new bool[](2);
        t3VaultsSelected[0] = true;
        t3VaultsSelected[1] = false;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_borrow_token_0() public {
        for (uint256 i = 0; i < t3VaultsSelected.length; ++i) {
            _baseTest(
                TestConfig({
                    isDirect: false, wrapBorrowedEth: false, borrowAmount0InUSD: 30_000, borrowAmount1InUSD: 0
                }),
                t3VaultsSelected[i]
            );
        }
    }

    function test_should_borrow_token_1() public {
        for (uint256 i = 0; i < t3VaultsSelected.length; ++i) {
            _baseTest(
                TestConfig({
                    isDirect: false, wrapBorrowedEth: false, borrowAmount0InUSD: 0, borrowAmount1InUSD: 30_000
                }),
                t3VaultsSelected[i]
            );
        }
    }

    function test_should_borrow_both_tokens() public {
        for (uint256 i = 0; i < t3VaultsSelected.length; ++i) {
            _baseTest(
                TestConfig({
                    isDirect: false, wrapBorrowedEth: false, borrowAmount0InUSD: 30_000, borrowAmount1InUSD: 30_000
                }),
                t3VaultsSelected[i]
            );
        }
    }

    function test_should_borrow_with_eth_wrap() public {
        for (uint256 i = 0; i < t3VaultsSelected.length; ++i) {
            _baseTest(
                TestConfig({
                    isDirect: false, wrapBorrowedEth: true, borrowAmount0InUSD: 30_000, borrowAmount1InUSD: 0
                }),
                t3VaultsSelected[i]
            );
        }
    }

    function test_should_borrow_action_direct() public {
        for (uint256 i = 0; i < t3VaultsSelected.length; ++i) {
            _baseTest(
                TestConfig({
                    isDirect: true, wrapBorrowedEth: false, borrowAmount0InUSD: 30_000, borrowAmount1InUSD: 0
                }),
                t3VaultsSelected[i]
            );
        }
    }

    function _baseTest(TestConfig memory config, bool _t3VaultsSelected) internal {
        address[] memory vaults = _t3VaultsSelected ? t3Vaults : t4Vaults;

        for (uint256 i = 0; i < vaults.length; ++i) {
            uint256 nftId = _t3VaultsSelected
                ? executeFluidVaultT3Open(
                    vaults[i],
                    200_000, /* initial supply amount in usd */
                    0, /* _borrowAmount0InUSD */
                    0, /* _borrowAmount1InUSD */
                    wallet,
                    address(openContract)
                )
                : executeFluidVaultT4Open(
                    vaults[i],
                    200_000, /* initial supply amount in usd */
                    0, /* initial supply amount 1 in usd */
                    0, /* borrowAmount0InUSD */
                    0, /* borrowAmount1InUSD */
                    wallet,
                    address(openContract)
                );

            if (nftId == 0) {
                logSkipTestBecauseOfOpen(vaults[i]);
                continue;
            }

            IFluidVaultT3.ConstantViews memory constants = IFluidVaultT3(vaults[i]).constantsView();
            LocalVars memory vars;

            FluidView fluidView = new FluidView();
            FluidView.VaultData memory vaultData = fluidView.getVaultData(vaults[i]);

            // -------------------- Handle borrow token 0. ---------------------
            vars.isNativeBorrow0 = constants.borrowToken.token0 == TokenUtils.ETH_ADDR;
            vars.borrowAmount0 = config.borrowAmount0InUSD != 0
                ? amountInUSDPrice(
                    vars.isNativeBorrow0 ? TokenUtils.WETH_ADDR : constants.borrowToken.token0,
                    config.borrowAmount0InUSD
                )
                : 0;

            // -------------------- Handle borrow token 1. ---------------------
            vars.isNativeBorrow1 = constants.borrowToken.token1 == TokenUtils.ETH_ADDR;
            vars.borrowAmount1 = config.borrowAmount1InUSD != 0
                ? amountInUSDPrice(
                    vars.isNativeBorrow1 ? TokenUtils.WETH_ADDR : constants.borrowToken.token1,
                    config.borrowAmount1InUSD
                )
                : 0;

            // -------------------- Estimate debt shares. --------------------
            vars.shares = estimateBorrowShares(vaultData.dexBorrowData.dexPool, vars.borrowAmount0, vars.borrowAmount1);

            if (borrowLimitReached(vaultData.dexBorrowData, vars.shares)) {
                logBorrowLimitReached(vaults[i]);
                continue;
            }

            // -------------------- Encode call data. --------------------
            vars.executeActionCallData = executeActionCalldata(
                fluidDexBorrowEncode(
                    vaults[i],
                    sender,
                    nftId,
                    0, // borrowAmount (not used for T3 or T4 vaults)
                    FluidDexModel.BorrowVariableData(vars.borrowAmount0, vars.borrowAmount1, vars.shares),
                    config.wrapBorrowedEth
                ),
                config.isDirect
            );

            // -------------------- Take snapshot before. --------------------

            vars.userPositionBefore = fetchPositionByNftId(nftId);
            vars.walletEthBalanceBefore = address(walletAddr).balance;

            vars.walletBorrowToken0BalanceBefore = vars.isNativeBorrow0
                ? balanceOf(TokenUtils.WETH_ADDR, walletAddr)
                : balanceOf(constants.borrowToken.token0, walletAddr);

            vars.walletBorrowToken1BalanceBefore = vars.isNativeBorrow1
                ? balanceOf(TokenUtils.WETH_ADDR, walletAddr)
                : balanceOf(constants.borrowToken.token1, walletAddr);

            vars.senderBorrowToken0BalanceBefore = vars.isNativeBorrow0
                ? config.wrapBorrowedEth ? balanceOf(TokenUtils.WETH_ADDR, sender) : address(sender).balance
                : balanceOf(constants.borrowToken.token0, sender);

            vars.senderBorrowToken1BalanceBefore = vars.isNativeBorrow1
                ? config.wrapBorrowedEth ? balanceOf(TokenUtils.WETH_ADDR, sender) : address(sender).balance
                : balanceOf(constants.borrowToken.token1, sender);

            // -------------------- Execute action. --------------------

            wallet.execute(address(cut), vars.executeActionCallData, 0);

            // -------------------- Take snapshot after. --------------------

            vars.userPositionAfter = fetchPositionByNftId(nftId);
            vars.walletEthBalanceAfter = address(walletAddr).balance;

            vars.walletBorrowToken0BalanceAfter = vars.isNativeBorrow0
                ? balanceOf(TokenUtils.WETH_ADDR, walletAddr)
                : balanceOf(constants.borrowToken.token0, walletAddr);

            vars.walletBorrowToken1BalanceAfter = vars.isNativeBorrow1
                ? balanceOf(TokenUtils.WETH_ADDR, walletAddr)
                : balanceOf(constants.borrowToken.token1, walletAddr);

            vars.senderBorrowToken0BalanceAfter = vars.isNativeBorrow0
                ? config.wrapBorrowedEth ? balanceOf(TokenUtils.WETH_ADDR, sender) : address(sender).balance
                : balanceOf(constants.borrowToken.token0, sender);

            vars.senderBorrowToken1BalanceAfter = vars.isNativeBorrow1
                ? config.wrapBorrowedEth ? balanceOf(TokenUtils.WETH_ADDR, sender) : address(sender).balance
                : balanceOf(constants.borrowToken.token1, sender);

            // -------------------- Assertions. --------------------

            assertEq(vars.walletEthBalanceAfter, vars.walletEthBalanceBefore);
            assertEq(vars.walletBorrowToken0BalanceAfter, vars.walletBorrowToken0BalanceBefore);
            assertEq(vars.walletBorrowToken1BalanceAfter, vars.walletBorrowToken1BalanceBefore);
            assertEq(vars.senderBorrowToken0BalanceAfter, vars.senderBorrowToken0BalanceBefore + vars.borrowAmount0);
            assertEq(vars.senderBorrowToken1BalanceAfter, vars.senderBorrowToken1BalanceBefore + vars.borrowAmount1);
            assertEq(vars.userPositionAfter.owner, walletAddr);
            assertEq(vars.userPositionAfter.isLiquidated, false);
            assertTrue(vars.userPositionAfter.borrow > vars.userPositionBefore.borrow);
        }
    }
}
