// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

/// @title ITokenGroupRegistry
interface ITokenGroupRegistry {
    function getFeeForTokens(address _sellToken, address _buyToken) external view returns (uint256);

    function addTokenInGroup(address _tokenAddr, uint256 _groupId) external;
    function addTokensInGroup(address[] memory _tokensAddr, uint256 _groupId) external;
    function addNewGroup(address[] memory _tokensAddr, uint256 _feeDivider) external;
    function changeGroupFee(uint256 _groupId, uint256 _newFeeDivider) external;
}
