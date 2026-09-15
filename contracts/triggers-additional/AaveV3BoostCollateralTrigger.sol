// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { ITrigger } from "../interfaces/core/ITrigger.sol";
import { AdminAuth } from "../auth/AdminAuth.sol";
import { IERC20 } from "../interfaces/token/IERC20.sol";
import { IPoolV3 } from "../interfaces/protocols/aaveV3/IPoolV3.sol";
import { IPoolAddressesProvider } from "../interfaces/protocols/aaveV3/IPoolAddressesProvider.sol";
import { DataTypes } from "../interfaces/protocols/aaveV3/DataTypes.sol";
import { AaveV3RatioHelper } from "../actions/aaveV3/helpers/AaveV3RatioHelper.sol";

/// @title Aave V3 boost collateral eligibility trigger
/// @notice Boost-only filter: at least one supplied, enabled collateral must have positive LTV.
/// @dev Does not replace execution-time liquidity, borrow-cap or account-capacity checks.
///      Must not be attached to repay strategies. Uses the market's current eMode configuration.
contract AaveV3BoostCollateralTrigger is ITrigger, AdminAuth, AaveV3RatioHelper {
    /// @param user Account holding the Aave position (smart wallet or EOA).
    /// @param market Aave V3 PoolAddressesProvider for the position's market.
    struct CalldataParams {
        address user;
        address market; // PoolAddressesProvider
    }

    /// @notice Returns whether the position has supplied collateral with positive effective LTV.
    /// @param _calldata ABI-encoded CalldataParams.
    /// @dev Subscription data is unused; all checker parameters are supplied through calldata.
    /// @return True if at least one eligible collateral asset has a nonzero aToken balance.
    function isTriggered(bytes memory _calldata, bytes memory)
        external
        view
        override
        returns (bool)
    {
        CalldataParams memory params = abi.decode(_calldata, (CalldataParams));
        IPoolV3 pool = IPoolV3(IPoolAddressesProvider(params.market).getPool());
        uint256 collateral = (pool.getUserConfiguration(params.user).data >> 1)
            & 0x5555555555555555555555555555555555555555555555555555555555555555;
        if (collateral == 0) return false;
        uint8 emode = uint8(pool.getUserEMode(params.user));
        uint16 reserveId;
        while (collateral != 0) {
            if (collateral & 1 != 0) {
                DataTypes.ReserveData memory reserve =
                    pool.getReserveData(pool.getReserveAddressById(reserveId));
                // Use actual borrowing LTV, never the safety-ratio fallback to liquidation threshold.
                (uint256 ltv,) = _getUserReserveLtvAndLltv(reserve, pool, emode);
                if (ltv != 0 && IERC20(reserve.aTokenAddress).balanceOf(params.user) != 0) {
                    return true;
                }
            }
            collateral >>= 2;
            ++reserveId;
        }
        return false;
    }

    /// @notice This checker does not update subscription data.
    function changedSubData(bytes memory) public pure override returns (bytes memory) { }

    /// @notice Checker parameters do not change after evaluation.
    function isChangeable() public pure override returns (bool) {
        return false;
    }
}
