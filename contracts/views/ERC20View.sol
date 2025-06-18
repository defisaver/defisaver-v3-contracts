// SPDX-License-Identifier: MIT
pragma solidity =0.8.27;

import { IERC20 } from "../interfaces/IERC20.sol";

contract ERC20View {
    
    struct Info {
        string name;
        string symbol;
        uint256 decimals;
        uint256 totalSupply;
        uint256 userBalance;
    }
    
    function batchInfo(address[] memory _tokens, address _user) external view returns (Info[] memory tokenInfo) {
        uint256 tokensLength = _tokens.length;
        tokenInfo = new Info[](tokensLength);
        for (uint256 i = 0; i < tokensLength; i++) {
            IERC20 token = IERC20(_tokens[i]);
            tokenInfo[i] = Info(
                token.name(),
                token.symbol(),
                token.decimals(),
                token.totalSupply(),
                token.balanceOf(_user)
            );
        }
    }
}