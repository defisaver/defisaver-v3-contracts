// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { ITroveManager } from "../../contracts/interfaces/protocols/liquity/ITroveManager.sol";
import { BaseTest } from "../utils/BaseTest.sol";
import {
    LiquityMinDebtTrigger
} from "../../contracts/triggers-additional/LiquityMinDebtTrigger.sol";

contract TestLiquityMinDebtTrigger is BaseTest {
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    LiquityMinDebtTrigger cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    CONSTANTS
    //////////////////////////////////////////////////////////////////////////*/
    address constant USER = address(0x1234);

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        if (!isMainnetSelected()) {
            vm.skip(true, "LiquityMinDebtTrigger test is mainnet only");
        }

        cut = new LiquityMinDebtTrigger();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_empty() public {
        assertFalse(check(0, 5000));
        assertTrue(check(0, 0));
    }

    function test_boundary() public {
        assertFalse(check(5000e18 - 1, 5000));
        assertTrue(check(5000e18, 5000));
        assertTrue(check(5000e18 + 1, 5000));
    }

    function testFuzz_threshold(uint128 debt) public {
        assertEq(check(debt, 5000), debt >= 5000e18);
    }

    function test_zeroMinimumAllowsAnyDebt() public {
        assertTrue(check(1, 0));
        assertTrue(check(0, 0));
    }

    function test_notChangeable() public view {
        assertFalse(cut.isChangeable());
        assertEq(cut.changedSubData(""), bytes(""));
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function check(uint256 debt, uint256 minimum) internal returns (bool) {
        vm.mockCall(
            address(cut.TroveManager()),
            abi.encodeCall(ITroveManager.getTroveDebt, (USER)),
            abi.encode(debt)
        );
        return cut.isTriggered(abi.encode(USER, minimum), "");
    }
}
