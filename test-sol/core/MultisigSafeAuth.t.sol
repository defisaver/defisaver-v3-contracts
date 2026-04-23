// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import "forge-std/Test.sol";
import { MockSmartWalletUtils } from "../../contracts/mocks/MockSmartWalletUtils.sol";

// Minimal mock Safe with a single owner
contract MockSafeSingleOwner {
    address[] internal _owners;

    constructor(address owner_) {
        _owners.push(owner_);
    }

    function getOwners() external view returns (address[] memory) {
        return _owners;
    }
}

// Minimal mock Safe with two owners
contract MockSafeMultiOwner {
    address[] internal _owners;

    constructor(address owner1_, address owner2_) {
        _owners.push(owner1_);
        _owners.push(owner2_);
    }

    function getOwners() external view returns (address[] memory) {
        return _owners;
    }
}

// A dummy contract to simulate a contract-owner (e.g. outer multisig Safe)
contract DummyContractOwner { }

contract MultisigSafeAuthTest is Test {
    MockSmartWalletUtils utils;

    function setUp() public {
        utils = new MockSmartWalletUtils();
    }

    // CASE 1 — 1/1 Safe with EOA owner
    // Current behaviour: returns owners[0] (the EOA) — CORRECT
    // Expected after fix: same, no change needed for this case
    function test_fetchOwnerOrWallet_returnsEOA_forSingleEOAOwner() public {
        address eoaOwner = address(0x1234);
        MockSafeSingleOwner wallet = new MockSafeSingleOwner(eoaOwner);

        address resolved = utils.fetchOwnerOrWallet(address(wallet));

        assertEq(resolved, eoaOwner, "Should return EOA owner directly for a 1/1 EOA-owned Safe");
    }

    // CASE 2 — 1/1 Safe whose sole owner is a CONTRACT (nested Safe / outer multisig)
    // Current behaviour: returns owners[0] which is a contract address — BUG
    //   GUI treats it as EOA, tries personal_sign, stalls forever
    // Expected after fix: returns wallet itself so EIP-1271 path is used
    function test_fetchOwnerOrWallet_returnsWallet_forSingleContractOwner() public {
        DummyContractOwner contractOwner = new DummyContractOwner();
        MockSafeSingleOwner wallet = new MockSafeSingleOwner(address(contractOwner));

        address resolved = utils.fetchOwnerOrWallet(address(wallet));

        // THIS TEST SHOULD FAIL BEFORE THE FIX (returns contractOwner address)
        // THIS TEST SHOULD PASS AFTER THE FIX  (returns wallet itself)
        assertEq(
            resolved,
            address(wallet),
            "Should return wallet itself when sole owner is a contract, not the contract owner"
        );
    }

    // CASE 3 — Multisig Safe (2+ owners, at least one EOA)
    // Current behaviour: returns wallet itself (owners.length != 1) — CORRECT at contract level
    // but GUI still can't auth because it doesn't know which signer to prompt
    // This test confirms the contract side behaves correctly already
    function test_fetchOwnerOrWallet_returnsWallet_forMultipleOwners() public {
        address owner1 = address(0x1111);
        address owner2 = address(0x2222);
        MockSafeMultiOwner wallet = new MockSafeMultiOwner(owner1, owner2);

        address resolved = utils.fetchOwnerOrWallet(address(wallet));

        assertEq(
            resolved,
            address(wallet),
            "Should return wallet itself for a multisig Safe (multiple owners)"
        );
    }
}
