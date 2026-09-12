// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { Test } from "forge-std/Test.sol";
import { FtDnmmHelper } from "../../../contracts/actions/ftdnmm/helpers/FtDnmmHelper.sol";
import { FtDnmmPayback } from "../../../contracts/actions/ftdnmm/FtDnmmPayback.sol";
import { FtDnmmRatioTrigger } from "../../../contracts/triggers/FtDnmmRatioTrigger.sol";
import { FtDnmmRatioCheck } from "../../../contracts/actions/checkers/FtDnmmRatioCheck.sol";
import { ActionBase } from "../../../contracts/actions/ActionBase.sol";
import {
    IPositionsManager
} from "../../../contracts/interfaces/protocols/ftdnmm/IPositionsManager.sol";
import {
    IConfigRegistry
} from "../../../contracts/interfaces/protocols/ftdnmm/IConfigRegistry.sol";
import {
    IAccountValuesLens,
    AccountSnapshot
} from "../../../contracts/interfaces/protocols/ftdnmm/IAccountValuesLens.sol";
import { IERC20 } from "../../../contracts/interfaces/token/IERC20.sol";
import {
    TransientStorageCancun
} from "../../../contracts/utils/transient/TransientStorageCancun.sol";
import { LocalWallet } from "../../utils/LocalWallet.sol";

contract TestFtDnmmRegression is Test, FtDnmmHelper {
    address internal constant ASSET = address(0x1234);
    address internal constant FUNDER = address(0x5678);
    address internal constant IRM = address(0x9012);
    LocalWallet internal wallet;
    FtDnmmPayback internal payback;
    FtDnmmRatioTrigger internal trigger;
    FtDnmmRatioCheck internal checker;

    function setUp() public {
        vm.warp(365 days + 1);
        wallet = new LocalWallet(address(this));
        payback = new FtDnmmPayback();
        trigger = new FtDnmmRatioTrigger();
        checker = new FtDnmmRatioCheck();
        vm.etch(address(trigger.tempStorage()), type(TransientStorageCancun).runtimeCode);
        vm.etch(POSITIONS_MANAGER, hex"00");
        vm.etch(ASSET, hex"00");
        vm.mockCall(ASSET, abi.encodeWithSelector(IERC20.allowance.selector), abi.encode(0));
        vm.mockCall(ASSET, abi.encodeWithSelector(IERC20.approve.selector), abi.encode(true));
        vm.mockCall(ASSET, abi.encodeWithSelector(IERC20.transferFrom.selector), abi.encode(true));
        vm.mockCall(POSITIONS_MANAGER, abi.encodeWithSelector(IPositionsManager.repay.selector), "");
    }

    function test_debt_preview_rounds_global_interest_up() public {
        // One unit of debt at 10% APR for one year accrues one whole unit.
        // Reconstructing borrows via the index floors 1 * 1.1 back to 1.
        _mockDebt(1, 1, 1, uint40(block.timestamp - 365 days));
        vm.mockCall(
            POSITIONS_MANAGER,
            abi.encodeCall(IPositionsManager.config, ()),
            abi.encode(CONFIG_REGISTRY)
        );
        IConfigRegistry.AssetCfg memory cfg;
        cfg.irm = IRM;
        vm.mockCall(
            CONFIG_REGISTRY, abi.encodeCall(IConfigRegistry.getAssetCfg, (ASSET)), abi.encode(cfg)
        );
        vm.mockCall(
            IRM,
            abi.encodeWithSignature("borrowAPR(address,uint256)", ASSET, 1e18),
            abi.encode(0.1e18)
        );
        vm.mockCall(
            ACCOUNT_VALUES_ROUTER,
            abi.encodeCall(IAccountValuesLens.previewBorrowIndexWad, (POSITIONS_MANAGER, ASSET)),
            abi.encode(1.1e18)
        );
        assertEq(getCurrentDebt(address(wallet), ASSET), 2);
    }

    function test_debt_preview_rounds_user_share_up() public {
        _mockDebt(1, 3, 10, uint40(block.timestamp));
        assertEq(getCurrentDebt(address(wallet), ASSET), 4);
    }

    function test_payback_caps_pull_and_return_to_debt() public {
        _mockDebt(100, 100, 100, uint40(block.timestamp));
        vm.mockCall(ASSET, abi.encodeCall(IERC20.balanceOf, (FUNDER)), abi.encode(1000));
        vm.expectCall(ASSET, abi.encodeCall(IERC20.transferFrom, (FUNDER, address(wallet), 100)), 1);
        assertEq(_payback(type(uint256).max, FUNDER), 100);
    }

    function test_payback_caps_explicit_amount_before_pull() public {
        _mockDebt(100, 100, 100, uint40(block.timestamp));
        vm.expectCall(ASSET, abi.encodeCall(IERC20.transferFrom, (FUNDER, address(wallet), 100)), 1);
        assertEq(_payback(1000, FUNDER), 100);
    }

    function test_payback_max_is_limited_by_funder_balance() public {
        _mockDebt(100, 100, 100, uint40(block.timestamp));
        vm.mockCall(ASSET, abi.encodeCall(IERC20.balanceOf, (FUNDER)), abi.encode(40));
        vm.expectCall(ASSET, abi.encodeCall(IERC20.transferFrom, (FUNDER, address(wallet), 40)), 1);
        assertEq(_payback(type(uint256).max, FUNDER), 40);
    }

    function test_payback_max_from_zero_uses_wallet_without_transfer() public {
        _mockDebt(100, 100, 100, uint40(block.timestamp));
        vm.mockCall(ASSET, abi.encodeCall(IERC20.balanceOf, (address(wallet))), abi.encode(40));
        vm.expectCall(
            ASSET, abi.encodeCall(IERC20.transferFrom, (address(wallet), address(wallet), 40)), 0
        );
        assertEq(_payback(type(uint256).max, address(0)), 40);
    }

    function test_zero_equity_position_triggers_under() public {
        _mockRatio(0, 1e18);
        assertTrue(_trigger(1e18, FtDnmmRatioTrigger.RatioState.UNDER));
        assertEq(trigger.tempStorage().getBytes32("FTDNMM_RATIO"), bytes32(0));
    }

    function test_zero_maintenance_does_not_trigger() public {
        _mockRatio(1e18, 0);
        assertFalse(_trigger(1e18, FtDnmmRatioTrigger.RatioState.UNDER));
        assertFalse(_trigger(0, FtDnmmRatioTrigger.RatioState.OVER));
    }

    function test_checker_uses_trigger_ratio_and_inclusive_offsets() public {
        _mockRatio(2e18, 1e18);
        assertTrue(_trigger(3e18, FtDnmmRatioTrigger.RatioState.UNDER));
        _mockRatio(3.05e18, 1e18);
        assertEq(_check(FtDnmmRatioCheck.RatioState.IN_REPAY, 3e18), 3.05e18);
        _mockRatio(3.05e18 + 1, 1e18);
        _expectBadRatio(2e18, 3.05e18 + 1, FtDnmmRatioCheck.RatioState.IN_REPAY, 3e18);

        _mockRatio(3e18, 1e18);
        assertTrue(_trigger(2e18, FtDnmmRatioTrigger.RatioState.OVER));
        _mockRatio(1.95e18, 1e18);
        assertEq(_check(FtDnmmRatioCheck.RatioState.IN_BOOST, 2e18), 1.95e18);
        _mockRatio(1.95e18 - 1, 1e18);
        _expectBadRatio(3e18, 1.95e18 - 1, FtDnmmRatioCheck.RatioState.IN_BOOST, 2e18);
    }

    function test_checker_rejects_wrong_direction() public {
        _mockRatio(2e18, 1e18);
        assertTrue(_trigger(3e18, FtDnmmRatioTrigger.RatioState.UNDER));
        _expectBadRatio(2e18, 2e18, FtDnmmRatioCheck.RatioState.IN_REPAY, 3e18);
        _expectBadRatio(2e18, 2e18, FtDnmmRatioCheck.RatioState.IN_BOOST, 1e18);
    }

    function _mockDebt(uint256 shares, uint256 totalShares, uint256 borrows, uint40 last) internal {
        vm.mockCall(
            POSITIONS_MANAGER,
            abi.encodeCall(IPositionsManager.debtShares, (address(wallet), ASSET)),
            abi.encode(shares)
        );
        vm.mockCall(
            POSITIONS_MANAGER,
            abi.encodeCall(IPositionsManager.totalDebtShares, (ASSET)),
            abi.encode(totalShares)
        );
        vm.mockCall(
            POSITIONS_MANAGER,
            abi.encodeCall(IPositionsManager.astate, (ASSET)),
            abi.encode(1e18, 0, borrows, 0, 0, 0, last, uint32(0))
        );
        vm.mockCall(
            ACCOUNT_VALUES_ROUTER,
            abi.encodeCall(IAccountValuesLens.previewBorrowIndexWad, (POSITIONS_MANAGER, ASSET)),
            abi.encode(1e18)
        );
    }

    function _payback(uint256 amount, address from) internal returns (uint256) {
        // Deliberately wrong literal params; map asset/from from subscription data and
        // amount from a previous action to exercise struct-order recipe mappings.
        bytes32[] memory subs = new bytes32[](2);
        subs[0] = bytes32(uint256(uint160(ASSET)));
        subs[1] = bytes32(uint256(uint160(from)));
        bytes32[] memory previous = new bytes32[](1);
        previous[0] = bytes32(amount);
        uint8[] memory mapping_ = new uint8[](3);
        mapping_[0] = 128;
        mapping_[1] = 1;
        mapping_[2] = 129;
        bytes memory result = wallet.execute(
            address(payback),
            abi.encodeCall(
                ActionBase.executeAction,
                (
                    abi.encode(FtDnmmPayback.Params(address(0), 0, address(0))),
                    subs,
                    mapping_,
                    previous
                )
            )
        );
        return uint256(abi.decode(result, (bytes32)));
    }

    function _mockRatio(uint256 equity, uint256 maint) internal {
        AccountSnapshot memory snap;
        snap.equityUSDWad = equity;
        snap.maintUSDWad = maint;
        vm.mockCall(
            ACCOUNT_VALUES_ROUTER,
            abi.encodeCall(IAccountValuesLens.accountValues, (POSITIONS_MANAGER, address(wallet))),
            abi.encode(snap)
        );
    }

    function _trigger(uint256 ratio, FtDnmmRatioTrigger.RatioState state) internal returns (bool) {
        return trigger.isTriggered(
            "", abi.encode(FtDnmmRatioTrigger.SubParams(address(wallet), ratio, uint8(state)))
        );
    }

    function _check(FtDnmmRatioCheck.RatioState state, uint256 target) internal returns (uint256) {
        return uint256(
            abi.decode(wallet.execute(address(checker), _checkData(state, target)), (bytes32))
        );
    }

    function _checkData(FtDnmmRatioCheck.RatioState state, uint256 target)
        internal
        pure
        returns (bytes memory)
    {
        bytes32[] memory subs = new bytes32[](2);
        subs[0] = bytes32(uint256(state));
        subs[1] = bytes32(target);
        uint8[] memory mapping_ = new uint8[](3);
        mapping_[0] = 254;
        mapping_[1] = 128;
        mapping_[2] = 129;
        return abi.encodeCall(
            ActionBase.executeAction,
            (
                abi.encode(
                    FtDnmmRatioCheck.Params(address(0), FtDnmmRatioCheck.RatioState.IN_BOOST, 0)
                ),
                subs,
                mapping_,
                new bytes32[](0)
            )
        );
    }

    function _expectBadRatio(
        uint256 start,
        uint256 current,
        FtDnmmRatioCheck.RatioState state,
        uint256 target
    ) internal {
        bytes memory data = _checkData(state, target);
        vm.expectRevert(
            abi.encodeWithSelector(
                LocalWallet.ExecutionFailed.selector,
                abi.encodeWithSelector(FtDnmmRatioCheck.BadAfterRatio.selector, start, current)
            )
        );
        wallet.execute(address(checker), data);
    }
}
