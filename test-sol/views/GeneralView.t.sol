// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IInstaAccount } from "../../contracts/interfaces/protocols/insta/IInstaAccount.sol";
import { BaseTest } from "test-sol/utils/BaseTest.sol";
import { SmartWallet } from "test-sol/utils/SmartWallet.sol";
import { GeneralView } from "../../contracts/views/GeneralView.sol";

contract TestGeneralView is BaseTest {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    GeneralView cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.createDSAProxy();

        cut = new GeneralView();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_fetchDSAProxyAccounts_oneAccount() public view {
        address[] memory accounts = cut.fetchDSAProxyAccounts(sender);
        assertEq(accounts.length, 1);
        assertEq(accounts[0], walletAddr);
    }

    function test_fetchDSAProxyAccounts_multipleAccounts() public {
        // Add second dsa account to sender
        SmartWallet secondWallet = new SmartWallet(alice);
        address secondWalletAddr = secondWallet.createDSAProxy();
        vm.prank(secondWalletAddr);
        IInstaAccount(secondWalletAddr).enable(sender);

        // Add third dsa account to sender
        SmartWallet thirdWallet = new SmartWallet(charlie);
        address thirdWalletAddr = thirdWallet.createDSAProxy();
        vm.prank(thirdWalletAddr);
        IInstaAccount(thirdWalletAddr).enable(sender);

        // Fetch accounts for sender
        address[] memory accounts = cut.fetchDSAProxyAccounts(sender);
        assertEq(accounts.length, 3);
        assertEq(accounts[0], walletAddr);
        assertEq(accounts[1], secondWalletAddr);
        assertEq(accounts[2], thirdWalletAddr);
    }

    function test_fetchDSAProxyAccounts_noAccounts() public {
        vm.prank(walletAddr); // simulate self-call
        IInstaAccount(walletAddr).disable(sender);
        address[] memory accounts = cut.fetchDSAProxyAccounts(sender);
        assertEq(accounts.length, 0);
    }
}
