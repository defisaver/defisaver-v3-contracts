// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { MockSmartWalletUtils } from "../../contracts/mocks/MockSmartWalletUtils.sol";
import { IInstaAccountV2 } from "../../contracts/interfaces/insta/IInstaAccountV2.sol";
import { BaseTest } from "../utils/BaseTest.sol";
import { SmartWallet } from "../utils/SmartWallet.sol";
import { WalletType } from "../../contracts/utils/DFSTypes.sol";

contract TestCore_SmartWalletUtils is BaseTest {

    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    MockSmartWalletUtils cut;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();
        cut = new MockSmartWalletUtils();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_return_true_for_ds_proxy_wallet() public {
        SmartWallet wallet = new SmartWallet(bob);
        address dsProxyAddress = wallet.createDSProxy();
        assertTrue(cut.isDSProxy(dsProxyAddress));
        assertFalse(cut.isDSAProxy(dsProxyAddress));
    }

    function test_should_return_false_for_safe_wallet() public {
        SmartWallet wallet = new SmartWallet(bob);
        address safeAddress = wallet.createSafe();
        assertFalse(cut.isDSProxy(safeAddress));
        assertFalse(cut.isDSAProxy(safeAddress));
    }

    function test_should_return_false_for_zero_address() public view {
        assertFalse(cut.isDSProxy(address(0)));
        assertFalse(cut.isDSAProxy(address(0)));
    }

    function test_should_return_false_for_eoa_address() public view {
        assertFalse(cut.isDSProxy(bob));
        assertFalse(cut.isDSAProxy(bob));
    }

    function test_should_return_correct_wallet_type() public {
        SmartWallet safeWallet = new SmartWallet(bob);
        address safeAddress = safeWallet.walletAddr();

        SmartWallet dsProxyWallet = new SmartWallet(alice);
        address dsProxyAddress = dsProxyWallet.createDSProxy();

        SmartWallet dsaProxyWallet = new SmartWallet(charlie);
        address dsaProxyAddress = dsaProxyWallet.createDSAProxy();

        assertTrue(cut.getWalletType(safeAddress) == WalletType.SAFE);
        assertTrue(cut.getWalletType(dsProxyAddress) == WalletType.DSPROXY);
        assertTrue(cut.getWalletType(dsaProxyAddress) == WalletType.DSAPROXY);
    }

    function test_fetch_owner_or_wallet() public {
        SmartWallet safeWallet = new SmartWallet(bob);
        address safeAddress = safeWallet.walletAddr();

        SmartWallet dsProxyWallet = new SmartWallet(alice);
        address dsProxyAddress = dsProxyWallet.createDSProxy();

        SmartWallet dsaProxyWallet = new SmartWallet(charlie);
        address dsaProxyAddress = dsaProxyWallet.createDSAProxy();

        assertTrue(cut.fetchOwnerOrWallet(safeAddress) == bob);
        assertTrue(cut.fetchOwnerOrWallet(dsProxyAddress) == alice);
        assertTrue(cut.fetchOwnerOrWallet(dsaProxyAddress) == charlie);

        // disable auth for dsa owner
        vm.prank(dsaProxyAddress); // simulate self-call
        IInstaAccountV2(dsaProxyAddress).disable(charlie);
        assertTrue(cut.fetchOwnerOrWallet(dsaProxyAddress) == dsaProxyAddress);
    }
}
