// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { CheckWalletType } from "../../contracts/utils/CheckWalletType.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { SmartWallet } from "../utils/SmartWallet.sol";

contract TestCore_CheckWalletType is BaseTest {

    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    CheckWalletType cut;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();
        cut = new CheckWalletType();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_return_true_for_ds_proxy_wallet() public {
        SmartWallet wallet = new SmartWallet(bob);
        address dsProxyAddress = wallet.createDSProxy();
        assertTrue(cut.isDSProxy(dsProxyAddress));
    }

    function test_should_return_false_for_safe_wallet() public {
        SmartWallet wallet = new SmartWallet(bob);
        address safeAddress = wallet.createSafe();
        assertFalse(cut.isDSProxy(safeAddress));
    }

    function test_should_return_false_for_zero_address() public {
        assertFalse(cut.isDSProxy(address(0)));
    }

    function test_should_return_false_for_eoa_address() public {
        assertFalse(cut.isDSProxy(bob));
    }
}
