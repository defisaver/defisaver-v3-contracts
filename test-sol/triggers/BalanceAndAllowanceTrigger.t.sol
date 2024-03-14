// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import { BalanceAndAllowanceTrigger } from "../../contracts/triggers/BalanceAndAllowanceTrigger.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { TriggersUtils } from "../utils/TriggersUtils.sol";
import { TokenAddresses } from "../TokenAddresses.sol";

contract TestBalanceAndAllowanceTrigger is TriggersUtils, BaseTest {

  /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    BalanceAndAllowanceTrigger cut;

    function setUp() public override {
        forkMainnet("BalanceAndAllowanceTrigger");
        cut = new BalanceAndAllowanceTrigger();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_trigger_when_there_is_enough_balance_and_allowance() public {
        uint256 amount = 100;
        address token = TokenAddresses.WETH_ADDR;
        bool useMaxAvailableBalance = false;
        bytes memory subDataEncoded = balanceAndAllowanceEncode(alice, bob, token, amount, useMaxAvailableBalance);

        deal(token, alice, amount);
        approveAsSender(alice, token, bob, amount);

        assertTrue(cut.isTriggered("", subDataEncoded));
    }
    function test_should_not_trigger_when_there_is_not_enough_balance() public {
        uint256 amount = 100;
        address token = TokenAddresses.WETH_ADDR;
        bool useMaxAvailableBalance = false;
        bytes memory subDataEncoded = balanceAndAllowanceEncode(alice, bob, token, amount, useMaxAvailableBalance);

        deal(token, alice, amount - 1);
        approveAsSender(alice, token, bob, amount);

        assertFalse(cut.isTriggered("", subDataEncoded));
    }
    function test_should_not_trigger_when_there_is_not_enough_allowance() public {
        uint256 amount = 100;
        address token = TokenAddresses.WETH_ADDR;
        bool useMaxAvailableBalance = false;
        bytes memory subDataEncoded = balanceAndAllowanceEncode(alice, bob, token, amount, useMaxAvailableBalance);

        deal(token, alice, amount);
        approveAsSender(alice, token, bob, amount - 1);

        assertFalse(cut.isTriggered("", subDataEncoded));
    } 
    function test_should_trigger_when_using_max_available_balance() public {
        uint256 amount = 100;
        address token = TokenAddresses.WETH_ADDR;
        bool useMaxAvailableBalance = true;
        bytes memory subDataEncoded = balanceAndAllowanceEncode(alice, bob, token, amount, useMaxAvailableBalance);

        deal(token, alice, amount - 1);
        approveAsSender(alice, token, bob, amount);

        assertTrue(cut.isTriggered("", subDataEncoded));
    }
    function test_should_trigger_while_ignoring_max_available_balance() public {
        uint256 amount = 100;
        address token = TokenAddresses.WETH_ADDR;
        bool useMaxAvailableBalance = true;
        bytes memory subDataEncoded = balanceAndAllowanceEncode(alice, bob, token, amount, useMaxAvailableBalance);

        deal(token, alice, amount * 2);
        approveAsSender(alice, token, bob, amount * 2);

        assertTrue(cut.isTriggered("", subDataEncoded));
    }
    function test_should_not_trigger_while_using_max_available_balance_and_not_enough_balance() public {
        uint256 amount = 100;
        address token = TokenAddresses.WETH_ADDR;
        bool useMaxAvailableBalance = true;
        bytes memory subDataEncoded = balanceAndAllowanceEncode(alice, bob, token, amount, useMaxAvailableBalance);

        approveAsSender(alice, token, bob, amount);

        assertFalse(cut.isTriggered("", subDataEncoded));
    }
    function test_should_not_trigger_while_using_max_available_balance_and_not_enough_allowance() public {
        uint256 amount = 100;
        address token = TokenAddresses.WETH_ADDR;
        bool useMaxAvailableBalance = true;
        bytes memory subDataEncoded = balanceAndAllowanceEncode(alice, bob, token, amount, useMaxAvailableBalance);

        deal(token, alice, amount - 1);
        approveAsSender(alice, token, bob, amount - 2);

        assertFalse(cut.isTriggered("", subDataEncoded));
    }
    function test_should_trigger_on_same_addresses() public {
        uint256 amount = 100;
        address token = TokenAddresses.WETH_ADDR;
        bool useMaxAvailableBalance = false;
        bytes memory subDataEncoded = balanceAndAllowanceEncode(alice, alice, token, amount, useMaxAvailableBalance);

        deal(token, alice, amount*2);

        assertTrue(cut.isTriggered("", subDataEncoded));
    }
    function test_should_not_trigger_on_same_addresses() public {
        uint256 amount = 100;
        address token = TokenAddresses.WETH_ADDR;
        bool useMaxAvailableBalance = false;
        bytes memory subDataEncoded = balanceAndAllowanceEncode(alice, alice, token, amount, useMaxAvailableBalance);

        deal(token, alice, amount - 1);

        assertFalse(cut.isTriggered("", subDataEncoded));
    } 
    function test_should_trigger_on_same_addresses_using_max_available_balance() public {
        uint256 amount = 100;
        address token = TokenAddresses.WETH_ADDR;
        bool useMaxAvailableBalance = true;
        bytes memory subDataEncoded = balanceAndAllowanceEncode(alice, alice, token, amount, useMaxAvailableBalance);

        deal(token, alice, amount - 1);

        assertTrue(cut.isTriggered("", subDataEncoded));
    }
    function test_should_not_trigger_on_same_addresses_using_max_available_balance() public {
        uint256 amount = 100;
        address token = TokenAddresses.WETH_ADDR;
        bool useMaxAvailableBalance = true;
        bytes memory subDataEncoded = balanceAndAllowanceEncode(alice, alice, token, amount, useMaxAvailableBalance);

        assertFalse(cut.isTriggered("", subDataEncoded));
    }
}
