// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

abstract contract IAToken {
    function redeem(uint256 _amount) external virtual;
    function balanceOf(address _owner) external virtual view returns (uint256 balance);
    function UNDERLYING_ASSET_ADDRESS() external virtual view returns (address);
    function nonces(address) external virtual view returns (uint256);
    function name() external virtual view returns(string memory);
}
