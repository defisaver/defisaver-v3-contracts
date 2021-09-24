// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../actions/curve/helpers/CurveHelper.sol";
import "../interfaces/curve/ILiquidityGauge.sol";

contract CurveView is CurveHelper {
    function gaugeBalance(address _gaugeAddr, address _user) external view returns (uint256) {
        return ILiquidityGauge(_gaugeAddr).balanceOf(_user);
    }

    function curveDepositSig(uint256 _nCoins, bool _useUnderlying) external pure returns (bytes4) {
        if (!_useUnderlying) {
            if (_nCoins == 2) return bytes4(keccak256("add_liquidity(uint256[2],uint256)"));
            if (_nCoins == 3) return bytes4(keccak256("add_liquidity(uint256[3],uint256)"));
            if (_nCoins == 4) return bytes4(keccak256("add_liquidity(uint256[4],uint256)"));
            if (_nCoins == 5) return bytes4(keccak256("add_liquidity(uint256[5],uint256)"));
            if (_nCoins == 6) return bytes4(keccak256("add_liquidity(uint256[6],uint256)"));
            if (_nCoins == 7) return bytes4(keccak256("add_liquidity(uint256[7],uint256)"));
            if (_nCoins == 8) return bytes4(keccak256("add_liquidity(uint256[8],uint256)"));
            revert("Invalid number of coins in pool.");
        }
        if (_nCoins == 2) return bytes4(keccak256("add_liquidity(uint256[2],uint256,bool)"));
        if (_nCoins == 3) return bytes4(keccak256("add_liquidity(uint256[3],uint256,bool)"));
        if (_nCoins == 4) return bytes4(keccak256("add_liquidity(uint256[4],uint256,bool)"));
        if (_nCoins == 5) return bytes4(keccak256("add_liquidity(uint256[5],uint256,bool)"));
        if (_nCoins == 6) return bytes4(keccak256("add_liquidity(uint256[6],uint256,bool)"));
        if (_nCoins == 7) return bytes4(keccak256("add_liquidity(uint256[7],uint256,bool)"));
        if (_nCoins == 8) return bytes4(keccak256("add_liquidity(uint256[8],uint256,bool)"));
        revert("Invalid number of coins in pool.");
    }

    function curveWithdrawSig(uint256 _nCoins, bool _useUnderlying) external pure returns (bytes4) {
        if (!_useUnderlying) {
            if (_nCoins == 2) return bytes4(keccak256("remove_liquidity(uint256,uint256[2])"));
            if (_nCoins == 3) return bytes4(keccak256("remove_liquidity(uint256,uint256[3])"));
            if (_nCoins == 4) return bytes4(keccak256("remove_liquidity(uint256,uint256[4])"));
            if (_nCoins == 5) return bytes4(keccak256("remove_liquidity(uint256,uint256[5])"));
            if (_nCoins == 6) return bytes4(keccak256("remove_liquidity(uint256,uint256[6])"));
            if (_nCoins == 7) return bytes4(keccak256("remove_liquidity(uint256,uint256[7])"));
            if (_nCoins == 8) return bytes4(keccak256("remove_liquidity(uint256,uint256[8])"));
            revert("Invalid number of coins in pool.");
        }
        if (_nCoins == 2) return bytes4(keccak256("remove_liquidity(uint256,uint256[2],bool)"));
        if (_nCoins == 3) return bytes4(keccak256("remove_liquidity(uint256,uint256[3],bool)"));
        if (_nCoins == 4) return bytes4(keccak256("remove_liquidity(uint256,uint256[4],bool)"));
        if (_nCoins == 5) return bytes4(keccak256("remove_liquidity(uint256,uint256[5],bool)"));
        if (_nCoins == 6) return bytes4(keccak256("remove_liquidity(uint256,uint256[6],bool)"));
        if (_nCoins == 7) return bytes4(keccak256("remove_liquidity(uint256,uint256[7],bool)"));
        if (_nCoins == 8) return bytes4(keccak256("remove_liquidity(uint256,uint256[8],bool)"));
        revert("Invalid number of coins in pool.");
    }

    function curveWithdrawImbalanceSig(uint256 _nCoins, bool _useUnderlying) external pure returns (bytes4) {
        if (!_useUnderlying) {
            if (_nCoins == 2) return bytes4(keccak256("remove_liquidity_imbalance(uint256[2],uint256)"));
            if (_nCoins == 3) return bytes4(keccak256("remove_liquidity_imbalance(uint256[3],uint256)"));
            if (_nCoins == 4) return bytes4(keccak256("remove_liquidity_imbalance(uint256[4],uint256)"));
            if (_nCoins == 5) return bytes4(keccak256("remove_liquidity_imbalance(uint256[5],uint256)"));
            if (_nCoins == 6) return bytes4(keccak256("remove_liquidity_imbalance(uint256[6],uint256)"));
            if (_nCoins == 7) return bytes4(keccak256("remove_liquidity_imbalance(uint256[7],uint256)"));
            if (_nCoins == 8) return bytes4(keccak256("remove_liquidity_imbalance(uint256[8],uint256)"));
            revert("Invalid number of coins in pool.");
        }
        if (_nCoins == 2) return bytes4(keccak256("remove_liquidity_imbalance(uint256[2],uint256,bool)"));
        if (_nCoins == 3) return bytes4(keccak256("remove_liquidity_imbalance(uint256[3],uint256,bool)"));
        if (_nCoins == 4) return bytes4(keccak256("remove_liquidity_imbalance(uint256[4],uint256,bool)"));
        if (_nCoins == 5) return bytes4(keccak256("remove_liquidity_imbalance(uint256[5],uint256,bool)"));
        if (_nCoins == 6) return bytes4(keccak256("remove_liquidity_imbalance(uint256[6],uint256,bool)"));
        if (_nCoins == 7) return bytes4(keccak256("remove_liquidity_imbalance(uint256[7],uint256,bool)"));
        if (_nCoins == 8) return bytes4(keccak256("remove_liquidity_imbalance(uint256[8],uint256,bool)"));
        revert("Invalid number of coins in pool.");
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
}