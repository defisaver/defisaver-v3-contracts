// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

interface IYVault {
    function withdraw(uint256 _shares) external ;
    function deposit(uint256 _amount) external ;
    function token() external view returns (address);

    function totalSupply() external view returns (uint256);
    function totalAssets() external view returns (uint256);
    function withdrawalQueue(uint256 i) external view returns (address);

    function strategies(address) external view returns (uint256, uint256, uint256,uint256, uint256, uint256, uint256, uint256, uint256);
}