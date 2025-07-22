// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {TransientStorage} from "../../contracts/utils/TransientStorage.sol";
import "forge-std/Test.sol";

contract TestTransientStorage is Test {
    TransientStorage transientStorage;

    bytes32 bytesToWrite = 0x5d41402abc4b2a76b9719d911017c59200000000000000000000000000000000;

    function setUp() public {
        transientStorage = new TransientStorage();
    }

    function test_getsWrittenInTransient() public {
        bytes32 res;
        transientStorage.setBytes32("hi", bytesToWrite);
        res = transientStorage.getBytes32("hi");

        assertEq(res, bytesToWrite);
    }

    /// forge-config: default.isolate = true
    /// @notice `isolate = true` simulates multiple transactions, so transient storage is cleared
    function test_getsClearedAfterTransaction() public {
        bytes32 res;
        transientStorage.setBytes32("hi", bytesToWrite);
        res = transientStorage.getBytes32("hi");

        assertEq(res, 0);
    }
}
