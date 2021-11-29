// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

interface IFlashLoans {
    function flashLoan(
        address recipient,
        address[] memory tokens,
        uint256[] memory amounts,
        bytes memory userData
    ) external;
}