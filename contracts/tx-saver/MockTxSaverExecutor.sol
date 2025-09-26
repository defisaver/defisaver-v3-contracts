// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

/// @dev Mock TxSaverExecutor which can be used for networks without TxSaverExecutor support.
/// This mock will be added inside the registry on the place of real TxSaverExecutor.
/// Zero fee type will turn off tx saver feature.
contract MockTxSaverExecutor {
    function getFeeType() external view returns (uint256){
        return 0;
    }
}