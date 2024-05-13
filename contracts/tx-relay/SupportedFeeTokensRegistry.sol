// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../auth/AdminAuth.sol";

/// @title Registry of supported fee tokens for tx relay
/// TODO[TX-RELAY]: Should we only support tokens with permit?
contract SupportedFeeTokensRegistry is AdminAuth {

    mapping (address => bool) public supportedFeeTokens;

    /// @notice Adds a new token to the list of supported fee tokens
    /// @param _token Address of the token
    function add(address _token) external onlyOwner {
        supportedFeeTokens[_token] = true;
    }

    /// @notice Removes a token from the list of supported fee tokens
    /// @param _token Address of the token
    function remove(address _token) external onlyOwner {
        supportedFeeTokens[_token] = false;
    }

    /// @notice Checks if a token is supported
    /// @param _token Address of the token
    function isSupported(address _token) external view returns (bool) {
        return supportedFeeTokens[_token];
    }
}
