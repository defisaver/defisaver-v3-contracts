// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IWeEth {
    function wrap(uint256 _eETHAmount) external returns (uint256);
	function unwrap(uint256 _weETHAmount) external returns (uint256);

    /// @notice Fetches the amount of weEth respective to the amount of eEth sent in
    function getWeETHByeETH(uint256 _eETHAmount) external view returns (uint256);

    /// @notice Fetches the amount of eEth respective to the amount of weEth sent in
    function getEETHByWeETH(uint256 _weETHAmount) external view returns (uint256);

    /// @notice Fetches the exchange rate of eETH for 1 weETH
    /// @return The amount of eETH for 1 weETH
    function getRate() external view returns (uint256);
}
