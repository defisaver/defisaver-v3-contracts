// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

interface IPriceOracleSentinel {
    /**
     * @notice Returns true if the `borrow` operation is allowed.
     * @dev Operation not allowed when PriceOracle is down or grace period not passed.
     * @return True if the `borrow` operation is allowed, false otherwise.
     */
    function isBorrowAllowed() external view returns (bool);
}
