// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

import "./ECDSA.sol";
import "./Address.sol";
import "../interfaces/IERC1271.sol";

import "hardhat/console.sol";

/**
 * @dev Signature verification helper: Provide a single mechanism to verify both private-key (EOA) ECDSA signature and
 * ERC1271 contract signatures. Using this instead of ECDSA.recover in your contract will make them compatible with
 * smart contract wallets such as Argent and Gnosis.
 *
 * Note: unlike ECDSA signatures, contract signature's are revocable, and the outcome of this function can thus change
 * through time. It could return true at block N and false at block N+1 (or the opposite).
 *
 * _Available since v4.1._
 */
library SignatureChecker {
    function isValidSignatureNow(address signer, bytes32 hash, bytes memory signature) internal view returns (bool) {
        if (Address.isContract(signer)) {
            try IERC1271(signer).isValidSignature(hash, signature) returns (bytes4 magicValue) {
                return magicValue == IERC1271(signer).isValidSignature.selector;
            } catch {
                return false;
            }
        } else {
            address w = ECDSA.recover(hash, signature);
            console.log("Recovered addr: ", w, signer);
            return w == signer;
        }
    }
}