// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;

import "hardhat/console.sol";

contract Decoder {

    function decodeRepay(bytes memory _tightPacked) public view returns(bytes32[] memory subData) {
        console.log(gasleft());
        subData = new bytes32[](3);

        bytes8 _vaultId;
        bytes8 _targetRatio;
        bytes20 _proxy;

        assembly {
            _vaultId := mload(add(_tightPacked, 0x20))
            _targetRatio := mload(add(_tightPacked, add(0x20, 8)))
            _proxy := mload(add(_tightPacked, add(0x20, 16)))
        }

        subData[0] = bytes32(uint256(uint64(_vaultId)));
        subData[1] = bytes32(uint256(uint64(_targetRatio)));
        subData[2] = bytes32(_proxy);
        console.log(gasleft());
    }
}