// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { FtDnmmSupply } from "../../contracts/actions/ftdnmm/FtDnmmSupply.sol";
import { FtDnmmBorrow } from "../../contracts/actions/ftdnmm/FtDnmmBorrow.sol";
import { FtDnmmView } from "../../contracts/views/FtDnmmView.sol";
import { IConfigRegistry } from "../../contracts/interfaces/protocols/ftdnmm/IConfigRegistry.sol";
import { FtDnmmTestBase } from "../actions/ftdnmm/FtDnmmTestBase.sol";

contract TestFtDnmmView is FtDnmmTestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    FtDnmmView cut;
    FtDnmmSupply supply;
    FtDnmmBorrow borrow;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        super.setUp();
        cut = new FtDnmmView();
        supply = new FtDnmmSupply();
        borrow = new FtDnmmBorrow();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_view_with_position() public {
        (bool positionCreated, TestPair memory pair, uint256 supplyAmount, uint256 borrowAmount) =
            _createPosition();
        if (!positionCreated) {
            logSkip(address(0), "no usable pair on this chain");
            return;
        }

        FtDnmmView.AccountData memory data = cut.getAccountData(walletAddr);

        assertGt(data.equityUSD, 0);
        assertGt(data.maintUSD, 0);
        assertEq(data.ratio, data.equityUSD * 1e18 / data.maintUSD);
        assertGt(data.ratio, 1e18);
        assertGt(data.hfTargetBps, 0);
        assertGt(data.hfSafeBps, 0);

        FtDnmmView.CollateralInfo[] memory colls = cut.getUserCollateral(walletAddr);
        assertEq(colls.length, 1);
        assertEq(colls[0].asset, pair.supplyAsset);
        assertEq(colls[0].avail, supplyAmount);
        assertEq(colls[0].hold, 0);
        assertGt(colls[0].priceUSD, 0);

        FtDnmmView.DebtInfo[] memory debts = cut.getUserDebts(walletAddr);
        assertEq(debts.length, 1);
        assertEq(debts[0].asset, pair.borrowAsset);
        assertGe(debts[0].debt, borrowAmount);
        assertGt(debts[0].priceUSD, 0);
    }

    function test_view_empty_account() public {
        FtDnmmView.AccountData memory data = cut.getAccountData(alice);

        assertEq(data.ratio, 0);
        assertEq(data.equityUSD, 0);
        assertEq(data.maintUSD, 0);

        assertEq(cut.getUserCollateral(alice).length, 0);
        assertEq(cut.getUserDebts(alice).length, 0);
    }

    function test_debt_preview_matches_protocol_repayment_after_time() public {
        (bool created, TestPair memory pair,, uint256 borrowed) = _createPosition();
        assertTrue(created);
        vm.warp(block.timestamp + 60);

        // Compare the view with the tokens actually consumed by the real PM, not
        // with the same helper used to implement the view.
        uint256 preview = cut.getCurrentDebt(walletAddr, pair.borrowAsset);
        assertGt(preview, borrowed);
        give(pair.borrowAsset, walletAddr, borrowed * 2);
        approveAsSender(walletAddr, pair.borrowAsset, POSITIONS_MANAGER, type(uint256).max);
        uint256 balanceBefore = balanceOf(pair.borrowAsset, walletAddr);
        vm.prank(walletAddr);
        positionsManager.repay(pair.borrowAsset, type(uint256).max);
        assertEq(preview, balanceBefore - balanceOf(pair.borrowAsset, walletAddr));
        assertEq(positionsManager.debtShares(walletAddr, pair.borrowAsset), 0);
    }

    function test_get_asset_config() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            if (!isPairUsable(testPairs[i], true)) continue;
            IConfigRegistry.AssetCfg memory cfg = cut.getAssetConfig(testPairs[i].borrowAsset);
            assertTrue(cfg.enabled);
            assertTrue(cfg.borrowable);
            return;
        }
        fail("FtDnmm: no asset config checked");
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _createPosition()
        internal
        returns (bool, TestPair memory, uint256 supplyAmount, uint256 borrowAmount)
    {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            TestPair memory testPair = testPairs[i];
            if (!isPairUsable(testPair, true)) continue;

            supplyAmount = supplyAmountFor(testPair.supplyAsset);
            borrowAmount = borrowAmountFor(testPair.borrowAsset);

            give(testPair.supplyAsset, sender, supplyAmount);
            approveAsSender(sender, testPair.supplyAsset, walletAddr, supplyAmount);
            _supply(address(supply), testPair.supplyAsset, supplyAmount, sender);

            _borrow(address(borrow), testPair.borrowAsset, borrowAmount, walletAddr);

            return (true, testPair, supplyAmount, borrowAmount);
        }

        TestPair memory emptyPair;
        return (false, emptyPair, 0, 0);
    }
}
