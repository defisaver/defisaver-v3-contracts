// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

interface ICurveFactoryLP {
    function minter() external view returns (address);
    function name() external view returns (string memory);
}

interface ICurveFactoryPool {
    function token() external view returns (address);
    function factory() external view returns (address);
    function get_virtual_price() external view returns (uint256);
}

interface ICurveFactory {
    function get_coins(address) external view returns (address[2] memory);
    function get_decimals(address) external view returns (uint256[2] memory);
    function get_balances(address) external view returns (uint256[2] memory);
    function get_gauge(address) external view returns (address);
}

interface IGaugeController {
    function gauge_types(address) external view returns (int128);
}
