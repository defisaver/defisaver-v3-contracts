// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IAToken {
    function redeem(uint256 _amount) external;
    function balanceOf(address _owner) external view returns (uint256 balance);
    function UNDERLYING_ASSET_ADDRESS() external view returns (address);
    function nonces(address) external view returns (uint256);
    function name() external view returns(string memory);
}
