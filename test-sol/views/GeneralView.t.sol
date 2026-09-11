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
                            TESTS - EOA HANDLING
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_flag_eoa() public view {
        (WalletType walletType, address owner, bool isEOA) = cut.getSmartWalletInfoWithCatch(bob);

        assertTrue(isEOA);
        assertEq(owner, bob);
        // SAFE is returned as a placeholder for EOAs, backend relies on the `isEOA` flag.
        assertTrue(walletType == WalletType.SAFE);
    }

    function test_should_flag_zero_address_as_eoa() public view {
        (WalletType walletType, address owner, bool isEOA) =
            cut.getSmartWalletInfoWithCatch(address(0));

        assertTrue(isEOA);
        assertEq(owner, address(0));
        assertTrue(walletType == WalletType.SAFE);
    }

    function test_should_flag_eoa_with_delegated_code() public {
        vm.etch(bob, abi.encodePacked(bytes3(0xef0100), address(cut)));

        (WalletType walletType, address owner, bool isEOA) = cut.getSmartWalletInfoWithCatch(bob);

        assertTrue(isEOA);
        assertEq(owner, bob);
        assertTrue(walletType == WalletType.SAFE);
    }

    /// @dev Known trade-off: `isEOA` really means "owner lookup reverted", so a contract that is
    ///      neither a known wallet type nor a Safe is reported as an EOA instead of reverting.
    ///      Backend only passes smart wallets and EOAs, so this case is not expected in practice.
    function test_should_flag_contract_that_is_not_a_wallet_as_eoa() public view {
        (WalletType walletType, address owner, bool isEOA) =
            cut.getSmartWalletInfoWithCatch(address(cut));

        assertTrue(isEOA);
        assertEq(owner, address(cut));
        assertTrue(walletType == WalletType.SAFE);
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
            (WalletType eoaAwareType, address eoaAwareOwner, bool isEOA) =
                cut.getSmartWalletInfoWithCatch(wallets[i]);

            assertFalse(isEOA);
            assertTrue(walletType == eoaAwareType);
            assertEq(owner, eoaAwareOwner);
        }
    }

    function testFuzz_should_never_revert(address _addr) public view {
        // Precompiles and the cheatcode address are not realistic inputs.
        vm.assume(uint160(_addr) > 20);
        vm.assume(_addr != address(vm));

        (WalletType walletType, address owner, bool isEOA) = cut.getSmartWalletInfoWithCatch(_addr);

        // A codeless account can never resolve an owner, so it always ends up flagged.
        if (_addr.code.length == 0) assertTrue(isEOA);

        if (isEOA) {
            assertEq(owner, _addr);
            assertTrue(walletType == WalletType.SAFE);
        } else {
            // Anything not flagged as an EOA must be reproducible through the plain call.
            (WalletType directType, address directOwner) = cut.getSmartWalletInfo(_addr);
            assertTrue(walletType == directType);
            assertEq(owner, directOwner);
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
