// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../actions/curve/helpers/CurveHelper.sol";
import "../interfaces/curve/ICurveFactory.sol";
import "../interfaces/curve/ILiquidityGauge.sol";
import "../interfaces/IERC20.sol";

contract CurveView is CurveHelper {
    struct LpBalance {
        address lpToken;
        uint256 balance;
    }

    struct CurveFactoryCache {
        ICurveFactoryLP factoryLp;
        ICurveFactoryPool factoryPool;
        ICurveFactory factory;

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
        pool = Registry.get_pool_from_lp_token(_lpToken);

        if (pool == address(0)) {
            CurveFactoryCache memory cache;
            cache.factoryLp = ICurveFactoryLP(_lpToken);
            pool = cache.factoryLp.minter();
            cache.factoryPool = ICurveFactoryPool(pool);
            cache.factory = ICurveFactory(cache.factoryPool.factory());

            virtualPrice = cache.factoryPool.get_virtual_price();
            poolName = cache.factoryLp.name();
            {
                address[2] memory factoryTokens = cache.factory.get_coins(pool);
                tokens[0] = factoryTokens[0];
                tokens[1] = factoryTokens[1];
            }
            {
                uint256[2] memory factoryDecimals = cache.factory.get_decimals(pool);
                decimals[0] = factoryDecimals[0];
                decimals[1] = factoryDecimals[1];
            }
            {
                uint256[2] memory factoryBalances = cache.factory.get_balances(pool);
                balances[0] = factoryBalances[0];
                balances[1] = factoryBalances[1];
            }

            underlyingTokens[0] = tokens[0];
            underlyingTokens[1] = tokens[1];

            underlyingDecimals[0] = decimals[0];
            underlyingDecimals[1] = decimals[1];

            underlyingBalances[0] = balances[0];
            underlyingBalances[1] = balances[1];

            gauges[0] = cache.factory.get_gauge(pool);
            gaugeTypes[0] = IGaugeController(GAUGE_CONTROLLER_ADDR).gauge_types(gauges[0]);
        } else {
            virtualPrice = Registry.get_virtual_price_from_lp_token(_lpToken);
            poolName = Registry.get_pool_name(pool);
            tokens = Registry.get_coins(pool);
            decimals = Registry.get_decimals(pool);
            balances = Registry.get_balances(pool);
            underlyingTokens = Registry.get_underlying_coins(pool);
            underlyingDecimals = Registry.get_underlying_decimals(pool);
            underlyingBalances = Registry.get_underlying_balances(pool);
            (gauges, gaugeTypes) = Registry.get_gauges(pool);
        }
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