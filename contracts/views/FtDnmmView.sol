// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { FtDnmmHelper } from "../actions/ftdnmm/helpers/FtDnmmHelper.sol";
import { IConfigRegistry } from "../interfaces/protocols/ftdnmm/IConfigRegistry.sol";
import { IOracleUSD } from "../interfaces/protocols/ftdnmm/IOracleUSD.sol";
import { AccountSnapshot } from "../interfaces/protocols/ftdnmm/IAccountValuesLens.sol";
import { ICircuitBreaker } from "../interfaces/protocols/ftdnmm/ICircuitBreaker.sol";
import {
    IftYieldWrapper,
    IftYieldStrategy
} from "../interfaces/protocols/ftdnmm/IftYieldWrapper.sol";
import { IERC20 } from "../interfaces/token/IERC20.sol";

/// @title Read-only view for ftDNMM accounts (for FE and strategy tooling)
contract FtDnmmView is FtDnmmHelper {
    struct AccountData {
        uint256 ratio;
        uint256 equityUSD;
        uint256 maintUSD;
        uint256 collUSD;
        uint256 debtUSD;
        int256 enginePnlUSD;
        uint16 hfTargetBps;
        uint16 hfSafeBps;
        uint256 minEquityUSD;
    }

    struct CollateralInfo {
        address asset;
        uint256 avail;
        uint256 hold;
        uint256 priceUSD;
    }

    struct DebtInfo {
        address asset;
        uint256 debt;
        uint256 priceUSD;
    }

    /// @notice Account-wide risk data, all USD values are WAD-scaled (1e18 = $1)
    function getAccountData(address _user) public view returns (AccountData memory data) {
        AccountSnapshot memory snap = valuesLens.accountValues(POSITIONS_MANAGER, _user);
        IConfigRegistry cfg = positionsManager.config();

        data = AccountData({
            ratio: snap.maintUSDWad == 0 ? 0 : snap.equityUSDWad * 1e18 / snap.maintUSDWad,
            equityUSD: snap.equityUSDWad,
            maintUSD: snap.maintUSDWad,
            collUSD: snap.collUSDWad,
            debtUSD: snap.debtUSDWad,
            enginePnlUSD: snap.enginePnLUSDWad,
            hfTargetBps: cfg.marginHfTargetBps(),
            hfSafeBps: cfg.marginHfSafeBps(),
            minEquityUSD: cfg.marginMinEquityUSDWad()
        });
    }

    /// @notice Collateral balances (avail = unreserved, hold = engine-reserved).
    /// @dev Withdrawals remain subject to liquidity, health-factor and circuit-breaker limits.
    function getUserCollateral(address _user) public view returns (CollateralInfo[] memory infos) {
        address[] memory assets = positionsManager.userCollateralAssets(_user);
        IOracleUSD oracle = IOracleUSD(positionsManager.config().oracleRouter());

        infos = new CollateralInfo[](assets.length);
        for (uint256 i = 0; i < assets.length; ++i) {
            (uint256 avail, uint256 hold,,,) = positionsManager.collateral(_user, assets[i]);
            infos[i] = CollateralInfo({
                asset: assets[i], avail: avail, hold: hold, priceUSD: oracle.priceUSD(assets[i])
            });
        }
    }

    /// @notice Current debt of a user per asset, including interest accrued since the last PM accrual
    function getUserDebts(address _user) public view returns (DebtInfo[] memory infos) {
        address[] memory assets = positionsManager.userDebtAssets(_user);
        IOracleUSD oracle = IOracleUSD(positionsManager.config().oracleRouter());

        infos = new DebtInfo[](assets.length);
        for (uint256 i = 0; i < assets.length; ++i) {
            infos[i] = DebtInfo({
                asset: assets[i],
                debt: getCurrentDebt(_user, assets[i]),
                priceUSD: oracle.priceUSD(assets[i])
            });
        }
    }

    /// @notice Per-asset configuration from the ftDNMM ConfigRegistry
    function getAssetConfig(address _asset) public view returns (IConfigRegistry.AssetCfg memory) {
        return positionsManager.config().getAssetCfg(_asset);
    }

    /// @notice Remaining shared withdraw/borrow CB capacity, in underlying token units.
    /// @param _wallet The DFS wallet receiving tokens from PM, not the action's final `to`.
    /// @dev Snapshot only: not a liquidity, collateral, borrow-cap or health-factor maximum.
    ///      uint.max means the breaker does not limit this outflow. Failed reads revert.
    ///      Withdraw(uint.max) still requests the wallet's full available collateral.
    function getOutflowCapacity(address _asset, address _wallet) public view returns (uint256) {
        IftYieldWrapper wrapper = IftYieldWrapper(getAssetConfig(_asset).ftYieldWrapper);
        address breaker = wrapper.circuitBreaker();
        if (breaker == address(0)) return type(uint256).max;

        // The wrapper computes this outside its CB try/catch, even when the CB is paused.
        address token = wrapper.token();
        uint256 tvl = _getWrapperTvl(wrapper, token);
        ICircuitBreaker cb = ICircuitBreaker(breaker);
        if (
            !cb.protectedContracts(address(wrapper)) || !cb.isActive()
                || cb.isWhitelistedRecipient(_wallet)
        ) return type(uint256).max;

        (uint256 main, uint256 elastic, uint256 lastUpdate) = cb.getRawAssetState(token);
        // _updateBuffers returns early in the same timestamp. The CB's public capacity
        // view instead clamps main to TVL * rate, so use raw buffers in this case.
        if (lastUpdate == 0 || lastUpdate != block.timestamp) {
            (main, elastic,) = cb.getAssetState(token, tvl);
        }

        // The CB stores uint96 buffers and adds them as uint96. An overflow in its
        // update/check reverts the CB call, which the wrapper deliberately catches.
        if (main > type(uint96).max || elastic > type(uint96).max) return type(uint256).max;
        uint256 available = main + elastic;
        return available > type(uint96).max ? type(uint256).max : available;
    }

    /// @dev Mirrors ftYieldWrapper._getTvl, including per-strategy decimal normalization.
    ///      valueOfCapital() on the wrapper does not perform that normalization.
    function _getWrapperTvl(IftYieldWrapper _wrapper, address _token)
        internal
        view
        returns (uint256 tvl)
    {
        tvl = IERC20(_token).balanceOf(address(_wrapper));
        uint256 underlyingDecimals = IERC20(_token).decimals();
        uint256 length = _wrapper.numberOfStrategies();
        for (uint256 i = 0; i < length; ++i) {
            IftYieldStrategy strategy = IftYieldStrategy(_wrapper.strategies(i));
            uint256 value = strategy.valueOfCapital();
            uint256 positionDecimals = IERC20(strategy.positionToken()).decimals();
            if (positionDecimals != underlyingDecimals) {
                value = value * 10 ** underlyingDecimals / 10 ** positionDecimals;
            }
            tvl += value;
        }
    }
}
