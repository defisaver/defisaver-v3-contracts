// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../interfaces/IERC20.sol";

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

    function batchInfoGas(address[] memory _tokens, address _user, uint256 _returnSize) external view returns (Info[] memory tokenInfo, uint256 breakIndex) {
        uint256 tokensLength = _tokens.length;
        tokenInfo = new Info[](_returnSize);
        breakIndex = 0;
        for (uint256 tokenCount = 0; breakIndex < tokensLength && tokenCount < _returnSize; breakIndex++) {
            IERC20 token = IERC20(_tokens[breakIndex]);
            uint256 userBalance = token.balanceOf(_user);
            
            if (userBalance != 0) {
                tokenInfo[tokenCount++] = Info(
                    token.name(),
                    token.symbol(),
                    token.decimals(),
                    token.totalSupply(),
                    userBalance
                );
            }
        }
    }
}