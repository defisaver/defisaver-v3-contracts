// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ITxSaverBytesTransientStorage } from "../interfaces/ITxSaverBytesTransientStorage.sol";

/// @title Used to store TxSaver data in a transaction
/// @dev Only TxSaverExecutor can store data, and anyone can read it
contract TxSaverBytesTransientStorage is ITxSaverBytesTransientStorage {
    
    uint256 constant POSITION_FEE_FLAG = 1;
    uint256 constant EOA_OR_WALLET_FEE_FLAG = 2;

    function setBytesTransiently(bytes memory _data, bool _takeFeeFromPosition) internal {
        uint256 dataLength = _data.length;

        // ensure data follows abi specification, so length will be multiple of 32 when using abi.encode    
        require(dataLength >= 32 && dataLength % 32 == 0);

        // write flag to first slot to indicate if fee is taken from position or EOA/wallet
        uint256 flag = _takeFeeFromPosition ? POSITION_FEE_FLAG : EOA_OR_WALLET_FEE_FLAG;
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

    function getFeeType() public view returns (uint256) {
        uint256 feeType;
        assembly{
            feeType := tload(0)
        }
        return feeType;
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
