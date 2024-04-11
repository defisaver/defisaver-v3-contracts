// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { AdminAuth } from "../auth/AdminAuth.sol";
 
contract SupportedFeeTokensRegistry is AdminAuth {

    mapping (address => bool) public supportedFeeTokens;

    function add(address _token) external onlyOwner {
        supportedFeeTokens[_token] = true;
    }

    function remove(address _token) external onlyOwner {
        supportedFeeTokens[_token] = false;
    }

    function isSupported(address _token) external view returns (bool) {
        return supportedFeeTokens[_token];
    }
}
