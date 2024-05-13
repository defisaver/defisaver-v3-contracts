// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface ITxRelayBytesTransientStorage {
    function dataHasBeenStoredForTakingFeeFromPosition() external view returns (bool);
    function getBytesTransiently() external view returns (bytes memory result);
}