// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

/// @title Used to store exchange data in a transaction
/// @dev Always set and read data in the same tx, and keep in mind it can be accessed by anyone
contract BytesTransientStorage {
    // Example:
    // 0x1cff79cd000004e4b26a5e2e6dad30c5d95f5ce78a8310f04c200000000009d4e4b26a5e2e6dad30c5d95f5ce78a8310f04c200000000002e6dad30c5d95f5ce78a8310f04c23030
    // This data has length of 72
    // Slot 0 will be 0x0000000000000000000000000000000000000000000000000000000000000048 
    // Slot 1 will be 0x1cff79cd000004e4b26a5e2e6dad30c5d95f5ce78a8310f04c200000000009d4 _data[0:32]
    // Slot 2 will be 0xe4b26a5e2e6dad30c5d95f5ce78a8310f04c200000000002e6dad30c5d95f5ce _data[32:64]
    // lastPart will be 0xc5d95f5ce78a8310f04c200000000002e6dad30c5d95f5ce78a8310f04c23030 _data[40:72] will be shifted to the left 24*8 times
    // Slot 3 will be 0x78a8310f04c23030000000000000000000000000000000000000000000000000
    
    function setBytesTransiently(bytes calldata _data) public {
        require(_data.length >= 32);
        // write length of _data to first slot
        assembly {
            tstore(0, _data.length)
        }
        // calculate how many slots at full size are we going to use
        uint256 chunks = _data.length / 32;
        uint256 i = 1;
        // write _data split into bytes32 from slot 1 to slot 1+chunks
        for (i; i <= chunks; ++i) {
            bytes32 chunk = bytes32(_data[32 * (i-1) : 32 * i]); // chunks are bytes32: _data[0:32] -> _data[32:64] -> etc
            assembly {
                tstore(i, chunk)
            }
        }
        // if there's any leftover write it in the next slot by writing last 32 bytes and then shifting left to delete what's already stored
        uint256 leftover = _data.length % 32;
        if (leftover > 0) {
            bytes32 lastPart = bytes32(_data[_data.length - 32 : _data.length]);
            lastPart = lastPart << ((32 - leftover) * 8);
            assembly {
                tstore(i, lastPart)
            }
        }
    }

    function getBytesTransiently() public view returns (bytes memory result){
        uint256 dataLength;
        // fetch data length from first slot
        assembly{
            dataLength := tload(0)
        }
        // find out how many full size chunks there are
        uint256 chunks = dataLength / 32;
        uint256 i = 1;
        // concat each full size chunk to the result
        for (i; i <= chunks; ++i) {
            bytes32 chunk;
            assembly {
                chunk := tload(i)
            }
            result = bytes.concat(result, chunk);
        }
        uint256 leftover = dataLength % 32;
        // create a bytes consisting only of the leftover information
        if (leftover > 0) {
            bytes32 lastChunk;
            assembly {
                lastChunk := tload(i)
            }
            bytes memory cutChunk = new bytes(leftover);
            for (uint256 j = 0; j < leftover; j++) {
                cutChunk[j] = bytes1(bytes32(lastChunk << (j * 8))); // Shift the bytes32 by 8 bits each time
            }
            
            result = bytes.concat(result, cutChunk);
        }
    }
    
}