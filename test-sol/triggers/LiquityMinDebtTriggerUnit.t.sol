// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { Test } from "forge-std/Test.sol";
import {
    LiquityMinDebtTrigger
} from "../../contracts/triggers-additional/LiquityMinDebtTrigger.sol";
import { ITroveManager } from "../../contracts/interfaces/protocols/liquity/ITroveManager.sol";

contract LiquityMinDebtTriggerUnitTest is Test {
    LiquityMinDebtTrigger checker;
    address constant USER = address(0x1234);

    function setUp() public {
        checker = new LiquityMinDebtTrigger();
    }

    function check(uint256 debt, uint256 minimum) internal returns (bool) {
        vm.mockCall(
            address(checker.TroveManager()),
            abi.encodeCall(ITroveManager.getTroveDebt, (USER)),
            abi.encode(debt)
        );
        return checker.isTriggered(abi.encode(USER, minimum), "");
    }

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
        assertFalse(checker.isChangeable());
        assertEq(checker.changedSubData(""), bytes(""));
    }
}
