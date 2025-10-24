// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

abstract contract IBasicTokenAdapters {
    bytes32 public collateralType;

    function decimals() public view virtual returns (uint256);
    function collateral() public view virtual returns (address);
    function join(address, uint256) public payable virtual;
    function exit(address, uint256) public virtual;
}
