// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;

interface IVatDaiFlashBorrower {
    /**
     * @dev Receive a flash loan.
     * @param initiator The initiator of the loan.
     * @param amount The amount of tokens lent. [rad]
     * @param fee The additional amount of tokens to repay. [rad]
     * @param data Arbitrary data structure, intended to contain user-defined parameters.
     * @return The keccak256 hash of "IVatDaiFlashLoanReceiver.onVatDaiFlashLoan"
     */
    function onVatDaiFlashLoan(
        address initiator,
        uint256 amount,
        uint256 fee,
        bytes calldata data
    ) external returns (bytes32);
}