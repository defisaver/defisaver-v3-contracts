// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";

/// @title TokenGroupRegistry - Keeps track of tokens that are in a same group for diff. fee models
contract TokenGroupRegistry is AdminAuth {
    /// @dev 0.25% fee as we divide the amount with this number
    uint256 public constant STANDARD_FEE_DIVIDER = 400;
    
    uint256 public constant STABLE_FEE_DIVIDER = 1000;
    uint256 public constant MAX_FEE_DIVIDER = 50;

    /// @dev maps token address to a registered group it belongs to
    mapping(address => uint256) public groupIds;

    /// @dev Array of groups where the index is the grouped id and the value is the fee
    uint256[] public feesPerGroup;

    enum Groups { NOT_LISTED, BANNED, STABLECOIN, ETH_BASED, BTC_BASED}

    error FeeTooHigh(uint256 fee);
    error GroupNonExistent(uint256 groupId);

    constructor() {
        feesPerGroup.push(STANDARD_FEE_DIVIDER); // NOT_LISTED
        feesPerGroup.push(0);                    // BANNED
        feesPerGroup.push(STABLE_FEE_DIVIDER);   // STABLECOIN
        feesPerGroup.push(STABLE_FEE_DIVIDER);   // ETH_BASED
        feesPerGroup.push(STABLE_FEE_DIVIDER);   // BTC_BASED
    }

    /// @notice Checks if 2 tokens are in the same group and returns the correct exchange fee for the pair
    function getFeeForTokens(address _sellToken, address _buyToken) public view returns (uint256) {
        uint256 firstId = groupIds[_sellToken];
        uint256 secondId = groupIds[_buyToken];

        // check if in the ban list, can just check the first token as we take fee from it
        if (firstId == uint8(Groups.BANNED)) {
            return 0;
        }
    
        if (firstId == secondId) {
            return feesPerGroup[secondId];
        }

        return STANDARD_FEE_DIVIDER;
    }

    /////////////////////////////// ONLY OWNER FUNCTIONS ///////////////////////////////

    /// @notice Adds token to an existing group
    /// @dev This will overwrite if token is part of a different group
    /// @dev Groups needs to exist to add to it
    function addTokenInGroup(address _tokenAddr, uint256 _groupId) public onlyOwner {
        if (_groupId >= feesPerGroup.length) revert GroupNonExistent(_groupId);

        groupIds[_tokenAddr] = _groupId;
    }

    /// @notice Add multiple tokens to a group
    function addTokensInGroup(address[] memory _tokensAddr, uint256 _groupId) public onlyOwner {
        if (_groupId >= feesPerGroup.length) revert GroupNonExistent(_groupId);

        for (uint256 i; i < _tokensAddr.length; ++i) {
            groupIds[_tokensAddr[i]] = _groupId;
        }
    }

    /// @notice Create new group and add tokens
    /// @dev Divider has to gte 50, which means max fee is 2%
    function addNewGroup(address[] memory _tokensAddr, uint256 _feeDivider) public onlyOwner {
        if(_feeDivider < MAX_FEE_DIVIDER) revert FeeTooHigh(_feeDivider);

        feesPerGroup.push(_feeDivider);

        addTokensInGroup(_tokensAddr, feesPerGroup.length - 1);
    }

    /// @notice Change existing group fee
    /// @dev Divider has to be gte 50, which means max fee is 2%
    function changeGroupFee(uint256 _groupId, uint256 _newFeeDivider) public onlyOwner {
        if(_newFeeDivider < MAX_FEE_DIVIDER) revert FeeTooHigh(_newFeeDivider);

        feesPerGroup[_groupId] = _newFeeDivider;
    }

}

