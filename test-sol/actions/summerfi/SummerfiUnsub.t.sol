// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { BaseTest } from "test-sol/utils/BaseTest.sol";
import { ActionsUtils } from "test-sol/utils/ActionsUtils.sol";
import { SummerfiUnsub } from "contracts/actions/summerfi/SummerfiUnsub.sol";
import { IDSProxy } from "contracts/interfaces/DS/IDSProxy.sol";

contract SummerfiUnsubTest is BaseTest, ActionsUtils {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    SummerfiUnsub cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    IDSProxy dsProxyAcc;
    address owner;

    uint256 cdpId1;
    uint256 cdpId2;
    uint256 cdpId3;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        cut = new SummerfiUnsub();

        owner = 0x08ae44cE15D7635e1fF61d3F489986aF8bC5848D;
        dsProxyAcc = IDSProxy(0xB0ceEf8fC302639Df74f6b18c3180064BC3c6Eb5);

        cdpId1 = 29_668;
        cdpId2 = 29_665;
        cdpId3 = 29_664;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_Unsub() public {
        uint256[] memory cdpIds = new uint256[](3);
        cdpIds[0] = cdpId1;
        cdpIds[1] = cdpId2;
        cdpIds[2] = cdpId3;

        bytes memory paramsCallData = abi.encode(SummerfiUnsub.Params({ cdpIds: cdpIds }));
        bytes memory executeActionCallData = executeActionCalldata(paramsCallData, false);

        vm.prank(owner);
        dsProxyAcc.execute(address(cut), executeActionCallData);
    }

    function test_Unsub_Fail() public {
        uint256[] memory cdpIds = new uint256[](1);
        uint256 cdpIdOfSomeoneElse = 30_612;
        cdpIds[0] = cdpIdOfSomeoneElse;

        bytes memory paramsCallData = abi.encode(SummerfiUnsub.Params({ cdpIds: cdpIds }));
        bytes memory executeActionCallData = executeActionCalldata(paramsCallData, false);

        vm.prank(owner);
        vm.expectRevert();
        dsProxyAcc.execute(address(cut), executeActionCallData);
    }
}
