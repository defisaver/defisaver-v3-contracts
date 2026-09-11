// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISafe } from "../../contracts/interfaces/protocols/safe/ISafe.sol";
import { ISafeProxyFactory } from "../../contracts/interfaces/protocols/safe/ISafeProxyFactory.sol";
import {
    IAccountImplementation
} from "../../contracts/interfaces/protocols/summerfi/IAccountImplementation.sol";
import { GeneralView } from "../../contracts/views/GeneralView.sol";
import { WalletType } from "../../contracts/utils/DFSTypes.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { SmartWallet } from "../utils/SmartWallet.sol";
import { Addresses } from "../utils/helpers/MainnetAddresses.sol";

contract TestGeneralView is BaseTest {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    GeneralView cut;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");
        cut = new GeneralView();
    }

    /*//////////////////////////////////////////////////////////////////////////
                              TESTS - SMART WALLETS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_return_owner_for_single_owner_safe() public {
        address safeAddr = new SmartWallet(bob).createSafe();

        (WalletType walletType, address owner) = cut.getSmartWalletInfo(safeAddr);

        assertTrue(walletType == WalletType.SAFE);
        assertEq(owner, bob);
    }

    /// @dev For Safes with more than one owner there is no single owner to return,
    ///      so the wallet itself is returned instead.
    function test_should_return_wallet_as_owner_for_multi_owner_safe() public {
        address safeAddr = _createMultiOwnerSafe(bob, alice);

        (WalletType walletType, address owner) = cut.getSmartWalletInfo(safeAddr);

        assertTrue(walletType == WalletType.SAFE);
        assertEq(owner, safeAddr);
    }

    function test_should_return_owner_for_dsproxy() public {
        skipIfAutomationNotSupportedOnSelectedNetwork();

        address dsProxyAddr = new SmartWallet(alice).createDSProxy();

        (WalletType walletType, address owner) = cut.getSmartWalletInfo(dsProxyAddr);

        assertTrue(walletType == WalletType.DSPROXY);
        assertEq(owner, alice);
    }

    function test_should_return_owner_for_dsa_proxy() public {
        skipIfAutomationNotSupportedOnSelectedNetwork();

        address dsaProxyAddr = new SmartWallet(charlie).createDSAProxy();

        (WalletType walletType, address owner) = cut.getSmartWalletInfo(dsaProxyAddr);

        assertTrue(walletType == WalletType.DSAPROXY);
        assertEq(owner, charlie);
    }

    function test_should_return_owner_for_sf_proxy() public {
        skipIfAutomationNotSupportedOnSelectedNetwork();

        address sfProxyAddr = new SmartWallet(jane).createSFProxy();

        (WalletType walletType, address owner) = cut.getSmartWalletInfo(sfProxyAddr);

        assertTrue(walletType == WalletType.SFPROXY);
        assertEq(owner, jane);
        assertEq(owner, IAccountImplementation(sfProxyAddr).owner());
    }

    function test_should_revert_for_eoa() public {
        vm.expectRevert();
        cut.getSmartWalletInfo(bob);
    }

    function test_should_revert_for_zero_address() public {
        vm.expectRevert();
        cut.getSmartWalletInfo(address(0));
    }

    /*//////////////////////////////////////////////////////////////////////////
                          TESTS - NOT SMART WALLET REVERT
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_revert_with_typed_error_for_eoa() public {
        vm.expectRevert(GeneralView.NotSmartWallet.selector);
        cut.getSmartWalletInfoWithCatch(bob);
    }

    function test_should_revert_with_typed_error_for_zero_address() public {
        vm.expectRevert(GeneralView.NotSmartWallet.selector);
        cut.getSmartWalletInfoWithCatch(address(0));
    }

    function test_should_revert_with_typed_error_for_eoa_with_delegated_code() public {
        vm.etch(bob, abi.encodePacked(bytes3(0xef0100), address(cut)));

        vm.expectRevert(GeneralView.NotSmartWallet.selector);
        cut.getSmartWalletInfoWithCatch(bob);
    }

    /// @dev A contract that is neither a known wallet type nor a Safe fails the owner lookup
    ///      and is reported as not being a smart wallet.
    function test_should_revert_with_typed_error_for_contract_that_is_not_a_wallet() public {
        vm.expectRevert(GeneralView.NotSmartWallet.selector);
        cut.getSmartWalletInfoWithCatch(address(cut));
    }

    /// @dev The plain call reverts without any data, the wrapper turns that into a typed error.
    function test_should_replace_bare_revert_with_typed_error() public {
        vm.expectRevert(bytes(""));
        cut.getSmartWalletInfo(bob);

        vm.expectRevert(GeneralView.NotSmartWallet.selector);
        cut.getSmartWalletInfoWithCatch(bob);
    }

    function test_should_match_plain_call_for_smart_wallets() public {
        skipIfAutomationNotSupportedOnSelectedNetwork();

        address[] memory wallets = new address[](4);
        wallets[0] = new SmartWallet(bob).createSafe();
        wallets[1] = new SmartWallet(alice).createDSProxy();
        wallets[2] = new SmartWallet(charlie).createDSAProxy();
        wallets[3] = new SmartWallet(jane).createSFProxy();

        for (uint256 i = 0; i < wallets.length; ++i) {
            (WalletType walletType, address owner) = cut.getSmartWalletInfo(wallets[i]);
            (WalletType wrappedType, address wrappedOwner) =
                cut.getSmartWalletInfoWithCatch(wallets[i]);

            assertTrue(walletType == wrappedType);
            assertEq(owner, wrappedOwner);
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _createMultiOwnerSafe(address _firstOwner, address _secondOwner)
        internal
        returns (address)
    {
        address[] memory owners = new address[](2);
        owners[0] = _firstOwner;
        owners[1] = _secondOwner;

        bytes memory setupData = abi.encodeWithSelector(
            ISafe.setup.selector,
            owners,
            1,
            address(0),
            bytes(""),
            address(0),
            address(0),
            0,
            payable(address(0))
        );

        return ISafeProxyFactory(Addresses.SAFE_PROXY_FACTORY)
            .createProxyWithNonce(Addresses.SAFE_SINGLETON, setupData, block.timestamp);
    }
}
