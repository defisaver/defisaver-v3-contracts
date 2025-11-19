// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { MockSmartWalletUtils } from "../../contracts/mocks/MockSmartWalletUtils.sol";
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
    function test_should_create_DSProxy_wallet() public {
        SmartWallet wallet = new SmartWallet(bob);
        address dsProxyAddress = wallet.createDSProxy();
        assertTrue(cut.isDSProxy(dsProxyAddress));
        assertFalse(cut.isDSAProxy(dsProxyAddress));
        assertFalse(cut.isSummerfiAccount(dsProxyAddress));
    }

    function test_should_create_Safe_wallet() public {
        SmartWallet wallet = new SmartWallet(bob);
        address safeAddress = wallet.createSafe();
        assertFalse(cut.isDSProxy(safeAddress));
        assertFalse(cut.isDSAProxy(safeAddress));
        assertFalse(cut.isSummerfiAccount(safeAddress));
    }

    function test_should_create_DSA_wallet() public {
        SmartWallet wallet = new SmartWallet(bob);
        address dsaProxyWallet = wallet.createDSAProxy();
        assertFalse(cut.isDSProxy(dsaProxyWallet));
        assertTrue(cut.isDSAProxy(dsaProxyWallet));
        assertFalse(cut.isSummerfiAccount(dsaProxyWallet));
    }

    function test_should_create_Summerfi_wallet() public {
        SmartWallet wallet = new SmartWallet(bob);
        address summerfiAcc = wallet.createSummerfiAcc();
        assertFalse(cut.isDSProxy(summerfiAcc));
        assertFalse(cut.isDSAProxy(summerfiAcc));
        assertTrue(cut.isSummerfiAccount(summerfiAcc));
    }

    function test_should_return_false_for_zero_address() public view {
        assertFalse(cut.isDSProxy(address(0)));
        assertFalse(cut.isDSAProxy(address(0)));
        assertFalse(cut.isSummerfiAccount(address(0)));
    }

    function test_should_return_false_for_eoa_address() public view {
        assertFalse(cut.isDSProxy(bob));
        assertFalse(cut.isDSAProxy(bob));
        assertFalse(cut.isSummerfiAccount(bob));
    }

    function test_should_return_correct_wallet_type() public {
        SmartWallet safeWallet = new SmartWallet(bob);
        address safeAddress = safeWallet.walletAddr();

        SmartWallet dsProxyWallet = new SmartWallet(alice);
        address dsProxyAddress = dsProxyWallet.createDSProxy();

        SmartWallet dsaProxyWallet = new SmartWallet(charlie);
        address dsaProxyAddress = dsaProxyWallet.createDSAProxy();

        SmartWallet summerfiAcc = new SmartWallet(jane);
        address summerfiAccAddress = summerfiAcc.createSummerfiAcc();

        assertTrue(cut.getWalletType(safeAddress) == WalletType.SAFE);
        assertTrue(cut.getWalletType(dsProxyAddress) == WalletType.DSPROXY);
        assertTrue(cut.getWalletType(dsaProxyAddress) == WalletType.DSAPROXY);
        assertTrue(cut.getWalletType(summerfiAccAddress) == WalletType.SFPROXY);
    }

    function test_fetch_owner_or_wallet() public {
        SmartWallet safeWallet = new SmartWallet(bob);
        address safeAddress = safeWallet.walletAddr();

        SmartWallet dsProxyWallet = new SmartWallet(alice);
        address dsProxyAddress = dsProxyWallet.createDSProxy();

        assertTrue(cut.fetchOwnerOrWallet(safeAddress) == bob);
        assertTrue(cut.fetchOwnerOrWallet(dsProxyAddress) == alice);
    }
}
