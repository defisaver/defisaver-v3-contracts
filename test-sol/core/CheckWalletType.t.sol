// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { SmartWalletUtils } from "../../contracts/utils/SmartWalletUtils.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { SmartWallet } from "../utils/SmartWallet.sol";

contract TestCore_CheckWalletType is BaseTest {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    SmartWalletUtils cut;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();
        cut = new SmartWalletUtils();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_return_true_for_ds_proxy_wallet() public {
        SmartWallet wallet = new SmartWallet(bob);
        address dsProxyAddress = wallet.createDSProxy();
        assertTrue(cut._isDSProxy(dsProxyAddress));
    }

    function test_should_return_false_for_safe_wallet() public {
        SmartWallet wallet = new SmartWallet(bob);
        address safeAddress = wallet.createSafe();
        assertFalse(cut._isDSProxy(safeAddress));
    }

    function test_should_return_false_for_zero_address() public view {
        assertFalse(cut._isDSProxy(address(0)));
    }

    function test_should_return_false_for_eoa_address() public view {
        assertFalse(cut._isDSProxy(bob));
    }
}
