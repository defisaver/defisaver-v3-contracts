// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

interface IYVault {
    function withdraw(uint256 _shares) external ;
    function deposit(uint256 _amount) external ;
    function token() external view returns (address);
}