// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;
pragma experimental ABIEncoderV2;

import "../actions/curve/helpers/CurveHelper.sol";
import "../interfaces/curve/ILiquidityGauge.sol";
import "../interfaces/IERC20.sol";

contract CurveView is CurveHelper {
    struct LpBalance {
        address lpToken;
        uint256 balance;
    }

    function gaugeBalance(address _gaugeAddr, address _user) external view returns (uint256) {
        return ILiquidityGauge(_gaugeAddr).balanceOf(_user);
    }

    function getPoolDataFromLpToken(address _lpToken) external view returns (
        uint256 virtualPrice,
        address pool,
        string memory poolName,
        address[8] memory tokens,
        uint256[8] memory decimals,
        uint256[8] memory balances,
        address[8] memory underlyingTokens,
        uint256[8] memory underlyingDecimals,
        uint256[8] memory underlyingBalances,
        address[10] memory gauges,
        int128[10] memory gaugeTypes
    ) {
        IRegistry Registry = getRegistry();
        virtualPrice = Registry.get_virtual_price_from_lp_token(_lpToken);
        pool = Registry.get_pool_from_lp_token(_lpToken);
        poolName = Registry.get_pool_name(pool);
        tokens = Registry.get_coins(pool);
        decimals = Registry.get_decimals(pool);
        balances = Registry.get_balances(pool);
        underlyingTokens = Registry.get_underlying_coins(pool);
        underlyingDecimals = Registry.get_underlying_decimals(pool);
        underlyingBalances = Registry.get_underlying_balances(pool);
        (gauges, gaugeTypes) = Registry.get_gauges(pool);
    }

    function getUserLP(
        address _user,
        uint256 _startIndex,
        uint256 _returnSize,
        uint256 _loopLimit
    ) external view returns (
        LpBalance[] memory lpBalances,
        uint256 nextIndex
    ) {
        lpBalances = new LpBalance[](_returnSize);
        IRegistry registry = getRegistry();
        uint256 listSize = registry.pool_count();
        
        uint256 nzCount = 0;
        uint256 index = _startIndex;
        for (uint256 i = 0; index < listSize && nzCount < _returnSize && i < _loopLimit; i++) {
            address pool = registry.pool_list(index++);
            address lpToken = registry.get_lp_token(pool);
            uint256 balance = IERC20(lpToken).balanceOf(_user);
            if (balance != 0) {
                lpBalances[nzCount++] = LpBalance(lpToken, balance);
            }
        }

        nextIndex = index < listSize ? index : 0;
    }
}