// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    TransientStorageCancun
} from "../../../contracts/utils/transient/TransientStorageCancun.sol";
import { BaseTest } from "../BaseTest.sol";

contract TestTransientStorageCancun is BaseTest {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    TransientStorageCancun cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    bytes32 bytesToWrite = 0x5d41402abc4b2a76b9719d911017c59200000000000000000000000000000000;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        cut = new TransientStorageCancun();
        bytes32 res;
        cut.setBytes32("hi", bytesToWrite);
        res = cut.getBytes32("hi");

        assertEq(res, bytesToWrite);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    /// forge-config: default.isolate = true
    /// @notice `isolate = true` simulates multiple transactions, so transient storage is cleared
    function test_getsClearedAfterTransaction() public {
        bytes32 res;
        cut.setBytes32("hi", bytesToWrite);
        res = cut.getBytes32("hi");

        assertEq(res, 0);
    }
}
