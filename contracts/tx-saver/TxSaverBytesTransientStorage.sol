// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ITxSaverBytesTransientStorage } from "../interfaces/ITxSaverBytesTransientStorage.sol";

/// @title Used to store TxSaver data in a transaction
/// @dev Only TxSaverExecutor can store data, and anyone can read it
contract TxSaverBytesTransientStorage is ITxSaverBytesTransientStorage {
    
    function setBytesTransiently(bytes memory _data, bool _takeFeeFromPosition) internal {
        uint256 dataLength = _data.length;

        /// @dev ensure data follows abi specification, so length will be multiple of 32 when using abi.encode    
        require(dataLength >= 32 && dataLength % 32 == 0);

        // write 1 to first slot as indicator that TxSaver stored data for taking fee from position or 0 otherwise
        uint256 flag = _takeFeeFromPosition ? 1 : 0;
        assembly {
            tstore(0, flag)
        }

        // write length of _data to second slot
        assembly {
            tstore(1, dataLength)
        }

        // calculate how many slots at full size are we going to use
        uint256 chunks = dataLength / 32;
        uint256 i = 1;
        // write _data split into bytes32 from slot 2 to slot 2+chunks
        for (i; i <= chunks; ++i) {
            uint256 slot = i + 1;
            bytes32 chunk;
            assembly {
                chunk := mload(add(_data, mul(0x20, i))) // chunks are bytes32: _data[0:32] -> _data[32:64] -> etc
                tstore(slot, chunk)
            }
        }
    }

    /// @dev Used to differentiate between taking fee from position and taking from EOA/wallet
    function isPositionFeeDataStored() public view returns (bool) {
        uint256 isDataStored;
        assembly{
            isDataStored := tload(0)
        }
        return isDataStored == 1;
    }

    function getBytesTransiently() public view returns (bytes memory result){
        uint256 dataLength;
        // fetch data length from second slot
        assembly{
            dataLength := tload(1)
        }
        // find out how many full size chunks there are
        uint256 chunks = dataLength / 32;
        uint256 i = 1;
        // concat each full size chunk to the result
        for (i; i <= chunks; ++i) {
            bytes32 chunk;
            uint256 slot = i + 1;
            assembly {
                chunk := tload(slot)
            }
            result = bytes.concat(result, chunk);
        }
    }
}
