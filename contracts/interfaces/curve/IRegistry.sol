// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

interface IRegistry {
    function get_lp_token(address) external view returns (address);
    function get_pool_from_lp_token(address) external view returns (address);
    function get_pool_name(address) external view returns(string memory);
    function get_coins(address) external view returns (address[8] memory);
    function get_n_coins(address) external view returns (uint256[2] memory);
    function get_underlying_coins(address) external view returns (address[8] memory);
    function get_decimals(address) external view returns (uint256[8] memory);
    function get_underlying_decimals(address) external view returns (uint256[8] memory);
    function get_balances(address) external view returns (uint256[8] memory);
    function get_underlying_balances(address) external view returns (uint256[8] memory);
    function get_virtual_price_from_lp_token(address) external view returns (uint256);
    function get_gauges(address) external view returns (address[10] memory, int128[10] memory);
    function pool_count() external view returns (uint256);
    function pool_list(uint256) external view returns (address);
}