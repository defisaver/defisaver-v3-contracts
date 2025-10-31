// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

// Interface for wrapping and unwrapping StEth
interface IWStEth {
    function wrap(uint256 _stETHAmount) external returns (uint256);
    function unwrap(uint256 _wstETHAmount) external returns (uint256);
    function stEthPerToken() external view returns (uint256);
    function tokensPerStEth() external view returns (uint256);
}
