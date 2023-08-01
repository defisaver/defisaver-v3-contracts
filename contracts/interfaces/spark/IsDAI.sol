// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../IERC20.sol";


interface IsDAI is IERC20 {
    function deposit(uint256 _amount, address _receiver) external;
    function mint(uint256 _shares, address _receiver) external;
    function withdraw(uint256 _amount, address _receiver, address _owner) external;
    function redeem(uint256 _shares, address _receiver, address _owner) external;
}