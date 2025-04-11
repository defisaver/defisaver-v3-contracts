// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IERC20 } from "../interfaces/IERC20.sol";

interface IFLReceiver {
    function receiveFlashLoan(
        address[] memory _tokens,
        uint256[] memory _amounts,
        uint256[] memory _feeAmounts,
        bytes memory _userData
    ) external;
}

/// @title Mock FL Balancer
/// @dev Used only in tests.
contract MockFLBalancer {

    error WrongPaybackAmount();

    function flashLoan(
        address recipient,
        address[] memory tokens,
        uint256[] memory amounts,
        bytes memory userData
    ) external {
        uint256 balanceBefore = IERC20(tokens[0]).balanceOf(address(this));
        
        IERC20(tokens[0]).transfer(recipient, amounts[0]);

        uint256[] memory feeAmounts = new uint256[](tokens.length);
        feeAmounts[0] = 0;
        
        IFLReceiver(recipient).receiveFlashLoan(tokens, amounts, feeAmounts, userData);

        uint256 balanceAfter = IERC20(tokens[0]).balanceOf(address(this));

        if (balanceAfter != balanceBefore) revert WrongPaybackAmount();
    }
}