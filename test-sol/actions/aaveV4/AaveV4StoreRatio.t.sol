// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AaveV4StoreRatio } from "../../../contracts/actions/aaveV4/AaveV4StoreRatio.sol";
import {
    TransientStorageCancun
} from "../../../contracts/utils/transient/TransientStorageCancun.sol";

import { Addresses } from "test-sol/utils/Addresses.sol";
import { SmartWallet } from "test-sol/utils/SmartWallet.sol";
import { AaveV4TestBase } from "./AaveV4TestBase.t.sol";
import { console2 } from "forge-std/console2.sol";

contract TestAaveV4StoreRatio is AaveV4TestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV4StoreRatio cut;
    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;
    TransientStorageCancun constant tempStorage =
        TransientStorageCancun(Addresses.TRANSIENT_STORAGE_CANCUN);

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkAaveV4DevNet();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new AaveV4StoreRatio();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_storeRatio() public {
        AaveV4TestPair[] memory tests = getTestPairs();
        for (uint256 i = 0; i < tests.length; ++i) {
            uint256 snapshotId = vm.snapshotState();

            AaveV4TestPair memory testPair = tests[i];

            if (!_executeAaveV4Open(testPair, 500, 100, sender, wallet)) {
                console2.log(
                    "Failed to open Aave V4 position. Check caps and reserve/spoke status."
                );
                continue;
            }

            bytes memory executeActionCallData =
                executeActionCalldata(aaveV4StoreRatioEncode(testPair.spoke, walletAddr), false);

            wallet.execute(address(cut), executeActionCallData, 0);

            uint256 storedRatio = uint256(tempStorage.getBytes32(AAVE_V4_RATIO_KEY));
            uint256 expectedRatio = cut.getRatio(testPair.spoke, walletAddr);

            assertEq(storedRatio, expectedRatio);
            assertGt(storedRatio, 0);

            vm.revertToState(snapshotId);
        }
    }
}
