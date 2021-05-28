// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

interface YVault {
    function withdraw(uint256 _shares) external ;
    function deposit(uint256 _amount) external ;
    function balanceOf(address _owner) external view returns (uint256 balance);
    function transfer(address _to, uint256 _value) external returns (bool success);
    function token() external view returns (address);
}