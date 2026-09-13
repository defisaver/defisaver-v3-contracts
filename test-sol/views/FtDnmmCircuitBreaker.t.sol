// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { FtDnmmTestBase } from "../actions/ftdnmm/FtDnmmTestBase.sol";
import { FtDnmmView } from "../../contracts/views/FtDnmmView.sol";
import { FtDnmmSupply } from "../../contracts/actions/ftdnmm/FtDnmmSupply.sol";
import { FtDnmmWithdraw } from "../../contracts/actions/ftdnmm/FtDnmmWithdraw.sol";
import { FtDnmmBorrow } from "../../contracts/actions/ftdnmm/FtDnmmBorrow.sol";
import { FtDnmmPayback } from "../../contracts/actions/ftdnmm/FtDnmmPayback.sol";
import { ICircuitBreaker } from "../../contracts/interfaces/protocols/ftdnmm/ICircuitBreaker.sol";
import {
    IftYieldWrapper,
    IftYieldStrategy
} from "../../contracts/interfaces/protocols/ftdnmm/IftYieldWrapper.sol";
import { IERC20 } from "../../contracts/interfaces/token/IERC20.sol";
import { LocalWallet } from "../utils/LocalWallet.sol";
import { Addresses } from "../utils/helpers/MainnetAddresses.sol";
import { console2 } from "forge-std/console2.sol";
import { StdStorage, stdStorage } from "forge-std/StdStorage.sol";

interface ILiveFtDnmmCB is ICircuitBreaker {
    function checkAndRecordOutflow(address asset, uint256 amount, uint256 tvl, address recipient)
        external
        returns (bool allowed, uint256 available);
    function withdrawalCapacity(address asset, uint256 tvl) external view returns (uint256);
    function getEffectiveConfig(address asset) external view returns (uint256, uint256, uint256);
    function owner() external view returns (address);
    function pause() external;
    function setWhitelistedRecipient(address recipient, bool enabled) external;
    function removeProtectedContract(address protectedContract) external;
    function setAssetConfig(address asset, uint256 rate, uint256 main, uint256 elastic) external;
    function emergencyOverride(address asset, uint256 amount) external;
}

interface ILiveFtDnmmWrapper is IftYieldWrapper {
    function withdraw(uint256 amount, address to) external;
    function strategyManager() external view returns (address);
    function setCircuitBreaker(address breaker) external;
}

contract FtDnmmCapacityHarness is FtDnmmView {
    function wrapperTvl(address asset) external view returns (uint256) {
        IftYieldWrapper wrapper = IftYieldWrapper(getAssetConfig(asset).ftYieldWrapper);
        return _getWrapperTvl(wrapper, wrapper.token());
    }
}

contract TestFtDnmmCircuitBreaker is FtDnmmTestBase {
    using stdStorage for StdStorage;

    FtDnmmCapacityHarness cut;
    FtDnmmSupply supply;
    FtDnmmWithdraw withdraw;
    FtDnmmBorrow borrow;
    FtDnmmPayback payback;
    LocalWallet actionWallet;

    function setUp() public override {
        super.setUp();
        cut = new FtDnmmCapacityHarness();
        supply = new FtDnmmSupply();
        withdraw = new FtDnmmWithdraw();
        borrow = new FtDnmmBorrow();
        payback = new FtDnmmPayback();
        // Preserve nested revert data and action return values on both chains.
        actionWallet = new LocalWallet(address(this));
        walletAddr = address(actionWallet);
    }

    function test_live_capacities_match_wrapper_rejection_and_cb_boundary() public {
        // Optional pinned mainnet snapshot for reproducible capacity measurements.
        uint256 pinnedBlock = vm.envOr("FTDNMM_CB_BLOCK", uint256(0));
        if (pinnedBlock != 0) {
            require(isMainnetSelected(), "Mainnet snapshot only");
            vm.createSelectFork(vm.envString("ETHEREUM_NODE"), pinnedBlock);
            cut = new FtDnmmCapacityHarness();
        }
        console2.log("Capacity block", block.number);
        console2.log("Capacity timestamp", block.timestamp);
        address[5] memory assets = [
            Addresses.WETH_ADDR,
            Addresses.USDC_ADDR,
            Addresses.WBTC_ADDR,
            Addresses.USDT_ADDR,
            Addresses.WSTETH_ADDR
        ];
        uint256 checked;
        for (uint256 i; i < assets.length; ++i) {
            if (assets[i].code.length == 0) continue;
            if (cut.getAssetConfig(assets[i]).ftYieldWrapper == address(0)) continue;
            uint256 snapshot = vm.snapshotState();
            _assertBoundary(assets[i], true);
            ++checked;
            vm.revertToState(snapshot);
        }
        // Sonic has no configured USDT wrapper or wstETH token.
        assertEq(checked, isMainnetSelected() ? 5 : 3);
    }

    function test_same_timestamp_uses_raw_buffers_after_tvl_drop() public {
        address asset = Addresses.WETH_ADDR;
        _deposit(asset, supplyAmountFor(asset));
        uint256 amount = supplyAmountFor(asset) / 2;
        // Force a main buffer above the new TVL cap without changing the CB's state.
        ILiveFtDnmmWrapper wrapper = _wrapper(asset);
        ILiveFtDnmmCB cb = _cb(asset);
        vm.prank(cb.owner());
        cb.setAssetConfig(asset, 1, 3600, 1800);
        uint256 expected = cut.getOutflowCapacity(asset, walletAddr);
        assertGt(expected, cb.withdrawalCapacity(asset, cut.wrapperTvl(asset)));
        assertEq(_execute(address(withdraw), asset, amount, walletAddr), amount);
        _assertBoundary(asset, false);
        assertEq(wrapper.circuitBreaker(), address(cb));
    }

    function test_uninitialized_asset_capacity_matches_first_outflow() public {
        address asset = Addresses.WETH_ADDR;
        ILiveFtDnmmCB cb = _cb(asset);
        vm.record();
        cb.getRawAssetState(asset);
        (bytes32[] memory reads,) = vm.accesses(address(cb));
        assertEq(reads.length, 1);
        vm.store(address(cb), reads[0], bytes32(0));
        (uint256 main, uint256 elastic, uint256 lastUpdate) = cb.getRawAssetState(asset);
        assertEq(main + elastic + lastUpdate, 0);
        _assertBoundary(asset, false);
    }

    function test_capacity_tracks_elastic_inflow_consumption_and_refill() public {
        address asset = Addresses.WETH_ADDR;
        ILiveFtDnmmCB cb = _cb(asset);
        _drain(asset);
        uint256 amount = supplyAmountFor(asset);
        _deposit(asset, amount);
        assertEq(cut.getOutflowCapacity(asset, walletAddr), amount);
        assertEq(_execute(address(withdraw), asset, amount / 2, walletAddr), amount / 2);
        assertEq(cut.getOutflowCapacity(asset, walletAddr), amount - amount / 2);
        (, uint256 mainWindow, uint256 elasticWindow) = cb.getEffectiveConfig(asset);
        vm.warp(block.timestamp + elasticWindow / 3);
        uint256 snapshot = vm.snapshotState();
        _assertBoundary(asset, false);
        vm.revertToState(snapshot);
        vm.warp(block.timestamp + mainWindow + elasticWindow);
        _assertBoundary(asset, false);
    }

    function test_withdraw_max_and_explicit_revert_without_partial_withdrawal() public {
        address asset = Addresses.WETH_ADDR;
        uint256 amount = supplyAmountFor(asset);
        _deposit(asset, amount);
        _drain(asset);
        bytes memory data = _actionData(asset, type(uint256).max, alice);
        vm.expectRevert(
            abi.encodeWithSelector(LocalWallet.ExecutionFailed.selector, _error(amount, 0))
        );
        actionWallet.execute(address(withdraw), data);
        data = _actionData(asset, amount / 2, alice);
        vm.expectRevert(
            abi.encodeWithSelector(LocalWallet.ExecutionFailed.selector, _error(amount / 2, 0))
        );
        actionWallet.execute(address(withdraw), data);
        assertEq(collateralAvail(walletAddr, asset), amount);
        assertEq(balanceOf(asset, alice), 0);
        assertEq(balanceOf(asset, walletAddr), 0);

        ILiveFtDnmmCB cb = _cb(asset);
        vm.prank(cb.owner());
        cb.emergencyOverride(asset, amount);
        assertEq(_execute(address(withdraw), asset, type(uint256).max, alice), amount);
        assertEq(collateralAvail(walletAddr, asset), 0);
        assertEq(balanceOf(asset, alice), amount);
    }

    function test_borrow_reverts_without_partial_debt_when_breaker_empty() public {
        _deposit(Addresses.WETH_ADDR, supplyAmountFor(Addresses.WETH_ADDR));
        address asset = Addresses.USDC_ADDR;
        _drain(asset);
        uint256 amount = borrowAmountFor(asset);
        bytes memory data = _actionData(asset, amount, alice);
        vm.expectRevert(
            abi.encodeWithSelector(LocalWallet.ExecutionFailed.selector, _error(amount, 0))
        );
        actionWallet.execute(address(borrow), data);
        assertEq(positionsManager.debtShares(walletAddr, asset), 0);
        assertEq(balanceOf(asset, alice), 0);
    }

    function test_supply_and_debt_capped_payback_with_empty_breaker() public {
        _assertInflows(false);
    }

    function test_supply_and_debt_capped_payback_when_record_inflow_reverts() public {
        _assertInflows(true);
    }

    function test_bypass_states_and_wallet_recipient() public {
        address asset = Addresses.WETH_ADDR;
        ILiveFtDnmmCB cb = _cb(asset);
        ILiveFtDnmmWrapper wrapper = _wrapper(asset);
        _deposit(asset, supplyAmountFor(asset));
        _drain(asset);
        vm.startPrank(cb.owner());
        cb.setWhitelistedRecipient(alice, true);
        vm.stopPrank();
        assertEq(cut.getOutflowCapacity(asset, alice), type(uint256).max);
        assertEq(cut.getOutflowCapacity(asset, walletAddr), 0);
        // Final `to` is whitelisted, but PM withdraws to the DFS wallet first.
        bytes memory data = _actionData(asset, 1, alice);
        vm.expectRevert(abi.encodeWithSelector(LocalWallet.ExecutionFailed.selector, _error(1, 0)));
        actionWallet.execute(address(withdraw), data);
        vm.prank(cb.owner());
        cb.setWhitelistedRecipient(walletAddr, true);
        assertEq(cut.getOutflowCapacity(asset, walletAddr), type(uint256).max);
        assertEq(_execute(address(withdraw), asset, 1, alice), 1);
        vm.prank(cb.owner());
        cb.pause();
        assertEq(cut.getOutflowCapacity(asset, sender), type(uint256).max);
        vm.prank(wrapper.strategyManager());
        wrapper.setCircuitBreaker(address(0));
        assertEq(cut.getOutflowCapacity(asset, walletAddr), type(uint256).max);
    }

    function test_view_read_failure_does_not_report_unlimited() public {
        ILiveFtDnmmCB cb = _cb(Addresses.WETH_ADDR);
        vm.mockCallRevert(
            address(cb), abi.encodeCall(ICircuitBreaker.isActive, ()), "CB read failed"
        );
        vm.expectRevert(bytes("CB read failed"));
        cut.getOutflowCapacity(Addresses.WETH_ADDR, walletAddr);
    }

    function test_uint96_overflow_matches_wrapper_fail_open() public {
        address asset = Addresses.WETH_ADDR;
        _deposit(asset, supplyAmountFor(asset));
        ILiveFtDnmmCB cb = _cb(asset);
        vm.prank(cb.owner());
        cb.emergencyOverride(asset, type(uint96).max);
        assertEq(cut.getOutflowCapacity(asset, walletAddr), type(uint256).max);
        assertEq(_execute(address(withdraw), asset, 1, walletAddr), 1);
    }

    function test_strategy_tvl_normalizes_position_decimals() public {
        address asset = Addresses.USDC_ADDR;
        ILiveFtDnmmWrapper wrapper = _wrapper(asset);
        if (wrapper.numberOfStrategies() == 0) {
            // Sonic holds USDC idle. Attach one synthetic strategy on the fork so
            // the deployed wrapper's private TVL loop is still exercised there.
            uint256 slot = stdstore.target(address(wrapper)).sig("numberOfStrategies()").find();
            address synthetic = makeAddr("mixed decimal strategy");
            address positionToken = makeAddr("18 decimal position token");
            vm.etch(synthetic, hex"00");
            vm.etch(positionToken, hex"00");
            vm.mockCall(
                synthetic,
                abi.encodeCall(IftYieldStrategy.positionToken, ()),
                abi.encode(positionToken)
            );
            vm.store(address(wrapper), bytes32(slot), bytes32(uint256(1)));
            vm.store(
                address(wrapper), keccak256(abi.encode(slot)), bytes32(uint256(uint160(synthetic)))
            );
        }
        address strategy = wrapper.strategies(0);
        address position = IftYieldStrategy(strategy).positionToken();
        // Exercise the real wrapper's private _getTvl with a mixed-decimal strategy.
        vm.mockCall(position, abi.encodeCall(IERC20.decimals, ()), abi.encode(uint8(18)));
        vm.mockCall(
            strategy, abi.encodeCall(IftYieldStrategy.valueOfCapital, ()), abi.encode(123e18)
        );
        vm.warp(block.timestamp + 1);
        _assertBoundary(asset, false);
    }

    function _assertInflows(bool revertingInflow) internal {
        address collateralAsset = Addresses.WETH_ADDR;
        address debtAsset = Addresses.USDC_ADDR;
        _deposit(collateralAsset, supplyAmountFor(collateralAsset));
        _execute(address(borrow), debtAsset, borrowAmountFor(debtAsset), walletAddr);
        _drain(collateralAsset);
        _drain(debtAsset);
        if (revertingInflow) {
            // Removing protection makes the actual CB's onlyProtectedContract revert.
            ILiveFtDnmmCB cb = _cb(collateralAsset);
            address wrapper = address(_wrapper(collateralAsset));
            vm.prank(cb.owner());
            cb.removeProtectedContract(wrapper);
            cb = _cb(debtAsset);
            wrapper = address(_wrapper(debtAsset));
            vm.prank(cb.owner());
            cb.removeProtectedContract(wrapper);
            assertEq(cut.getOutflowCapacity(debtAsset, walletAddr), type(uint256).max);
        }
        uint256 depositAmount = supplyAmountFor(collateralAsset);
        _deposit(collateralAsset, depositAmount);
        assertEq(collateralAvail(walletAddr, collateralAsset), depositAmount * 2);
        uint256 debt = cut.getCurrentDebt(walletAddr, debtAsset);
        give(debtAsset, sender, debt * 2);
        approveAsSender(sender, debtAsset, walletAddr, debt);
        assertEq(_execute(address(payback), debtAsset, type(uint256).max, sender), debt);
        assertEq(balanceOf(debtAsset, sender), debt);
        assertEq(positionsManager.debtShares(walletAddr, debtAsset), 0);
        if (!revertingInflow) {
            assertEq(cut.getOutflowCapacity(collateralAsset, walletAddr), depositAmount);
            assertEq(cut.getOutflowCapacity(debtAsset, walletAddr), debt);
        }
    }

    function _assertBoundary(address asset, bool logState) internal {
        ILiveFtDnmmWrapper wrapper = _wrapper(asset);
        ILiveFtDnmmCB cb = _cb(asset);
        uint256 capacity = cut.getOutflowCapacity(asset, walletAddr);
        assertLt(capacity, type(uint96).max);
        uint256 tvl = cut.wrapperTvl(asset);
        if (logState) {
            console2.log("Asset", IERC20(asset).symbol());
            console2.log("Wrapper", address(wrapper));
            console2.log("CB", address(cb));
            console2.log("TVL raw", tvl);
            console2.log("Capacity raw", capacity);
            console2.log("Decimals", IERC20(asset).decimals());
            console2.log("Borrowable", cut.getAssetConfig(asset).borrowable);
            (, uint256 cash,,,,,,) = positionsManager.astate(asset);
            console2.log("PM cash raw", cash);
            (uint256 rate, uint256 main, uint256 elastic) = cb.getEffectiveConfig(asset);
            console2.log("Rate WAD", rate);
            console2.log("Main window seconds", main);
            console2.log("Elastic window seconds", elastic);
        }
        // Independent oracle: the real wrapper computes preTvl internally and returns
        // the actual CB's available in its error, before any liquidity/balance check.
        vm.expectRevert(_error(capacity + 1, capacity));
        vm.prank(POSITIONS_MANAGER);
        wrapper.withdraw(capacity + 1, walletAddr);
        vm.prank(address(wrapper));
        (bool allowed, uint256 available) =
            cb.checkAndRecordOutflow(asset, capacity + 1, tvl, walletAddr);
        assertFalse(allowed);
        assertEq(available, capacity);
        vm.prank(address(wrapper));
        (allowed, available) = cb.checkAndRecordOutflow(asset, capacity, tvl, walletAddr);
        assertTrue(allowed);
        assertEq(available, capacity);
        assertEq(cut.getOutflowCapacity(asset, walletAddr), 0);
    }

    function _drain(address asset) internal {
        uint256 capacity = cut.getOutflowCapacity(asset, walletAddr);
        uint256 tvl = cut.wrapperTvl(asset);
        ILiveFtDnmmCB cb = _cb(asset);
        vm.prank(address(_wrapper(asset)));
        (bool allowed,) = cb.checkAndRecordOutflow(asset, capacity, tvl, walletAddr);
        assertTrue(allowed);
        assertEq(cut.getOutflowCapacity(asset, walletAddr), 0);
    }

    function _wrapper(address asset) internal view returns (ILiveFtDnmmWrapper) {
        return ILiveFtDnmmWrapper(cut.getAssetConfig(asset).ftYieldWrapper);
    }

    function _cb(address asset) internal view returns (ILiveFtDnmmCB) {
        return ILiveFtDnmmCB(_wrapper(asset).circuitBreaker());
    }

    function _deposit(address asset, uint256 amount) internal {
        give(asset, sender, amount);
        approveAsSender(sender, asset, walletAddr, amount);
        assertEq(_execute(address(supply), asset, amount, sender), amount);
    }

    function _execute(address action, address asset, uint256 amount, address account)
        internal
        returns (uint256)
    {
        return abi.decode(
            actionWallet.execute(action, _actionData(asset, amount, account)), (uint256)
        );
    }

    function _actionData(address asset, uint256 amount, address account)
        internal
        view
        returns (bytes memory)
    {
        return executeActionCalldata(abi.encode(asset, amount, account), false);
    }

    function _error(uint256 requested, uint256 available) internal pure returns (bytes memory) {
        return abi.encodeWithSignature(
            "ftYieldWrapperRateLimitExceeded(uint256,uint256)", requested, available
        );
    }
}
