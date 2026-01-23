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
    struct User {
        address owner;
        IDSProxy account;
        uint256[] cdpIds;
        uint256[] triggerIds;
    }

    User[] users;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        cut = new SummerfiUnsub();

        _initUsers();
    }

    function _initUsers() internal {
        // user 0
        uint256[] memory cdpIds0 = new uint256[](5);
        cdpIds0[0] = 29_664;
        cdpIds0[1] = 29_664;
        cdpIds0[2] = 29_665;
        cdpIds0[3] = 29_665;
        cdpIds0[4] = 29_668;

        uint256[] memory triggerIds0 = new uint256[](5);
        triggerIds0[0] = 854;
        triggerIds0[1] = 855;
        triggerIds0[2] = 853;
        triggerIds0[3] = 856;
        triggerIds0[4] = 1628;

        users.push(
            User({
                owner: 0x08ae44cE15D7635e1fF61d3F489986aF8bC5848D,
                account: IDSProxy(0xB0ceEf8fC302639Df74f6b18c3180064BC3c6Eb5),
                cdpIds: cdpIds0,
                triggerIds: triggerIds0
            })
        );

        // user 1
        uint256[] memory cdpIds1 = new uint256[](4);
        cdpIds1[0] = 24_951;
        cdpIds1[1] = 24_951;
        cdpIds1[2] = 24_951;
        cdpIds1[3] = 24_951;

        uint256[] memory triggerIds1 = new uint256[](4);
        triggerIds1[0] = 1479;
        triggerIds1[1] = 1487;
        triggerIds1[2] = 1505;
        triggerIds1[3] = 1533;

        users.push(
            User({
                owner: 0xcF5E7673De7B246e18fde4af55DAA732589b41be,
                account: IDSProxy(0x6a0040D33D3C421cbD74157aac822F7DB9881858),
                cdpIds: cdpIds1,
                triggerIds: triggerIds1
            })
        );

        // user 2
        uint256[] memory cdpIds2 = new uint256[](14);
        cdpIds2[0] = 29_332;
        cdpIds2[1] = 29_333;
        cdpIds2[2] = 29_334;
        cdpIds2[3] = 29_367;
        cdpIds2[4] = 29_368;
        cdpIds2[5] = 29_369;
        cdpIds2[6] = 29_370;
        cdpIds2[7] = 30_550;
        cdpIds2[8] = 30_551;
        cdpIds2[9] = 30_552;
        cdpIds2[10] = 30_553;
        cdpIds2[11] = 30_554;
        cdpIds2[12] = 30_555;
        cdpIds2[13] = 30_556;

        uint256[] memory triggerIds2 = new uint256[](14);
        triggerIds2[0] = 2609;
        triggerIds2[1] = 1639;
        triggerIds2[2] = 1640;
        triggerIds2[3] = 590;
        triggerIds2[4] = 587;
        triggerIds2[5] = 588;
        triggerIds2[6] = 589;
        triggerIds2[7] = 1638;
        triggerIds2[8] = 2607;
        triggerIds2[9] = 2605;
        triggerIds2[10] = 2604;
        triggerIds2[11] = 1644;
        triggerIds2[12] = 1645;
        triggerIds2[13] = 2608;

        users.push(
            User({
                owner: 0xFe582482C459868532C60a9dE0baA0de1923f271,
                account: IDSProxy(0xf89Be79C1bc66224F675A603A40a99d4B9Bb7E11),
                cdpIds: cdpIds2,
                triggerIds: triggerIds2
            })
        );
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_Unsub() public {
        for (uint256 i = 0; i < users.length; ++i) {
            User storage u = users[i];

            bytes memory paramsCallData = SummerfiUnsubEncode(u.cdpIds, u.triggerIds);
            bytes memory executeActionCallData = executeActionCalldata(paramsCallData, false);

            vm.prank(u.owner);
            u.account.execute(address(cut), executeActionCallData);
        }
    }

    function test_Unsub_Fail() public {
        uint256[] memory cdpIds = new uint256[](1);
        uint256 cdpIdOfSomeoneElse = 30_612;
        cdpIds[0] = cdpIdOfSomeoneElse;

        uint256[] memory triggerIds = new uint256[](1);
        triggerIds[0] = 0;

        bytes memory paramsCallData = SummerfiUnsubEncode(cdpIds, triggerIds);
        bytes memory executeActionCallData = executeActionCalldata(paramsCallData, false);

        vm.prank(users[0].owner);
        vm.expectRevert();
        users[0].account.execute(address(cut), executeActionCallData);
    }
}
