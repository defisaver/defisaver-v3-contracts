// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IDSProxyFactory } from "../interfaces/IDSProxyFactory.sol";
import { ISafe } from "../interfaces/safe/ISafe.sol";
import { IInstaList } from "../interfaces/insta/IInstaList.sol";
import { DSProxyFactoryHelper } from "./ds-proxy-factory/DSProxyFactoryHelper.sol";
import { DSAProxyFactoryHelper } from "./dsa-proxy-factory/DSAProxyFactoryHelper.sol";
import { WalletType } from "../utils/DFSTypes.sol";

/// @title CheckWalletType - Helper contract to check which type of wallet an address represents
contract CheckWalletType is DSProxyFactoryHelper, DSAProxyFactoryHelper {

    error UnsupportedWallet(address);

    /// @notice Check if the wallet is a DSProxy
    function isDSProxy(address _wallet) public view returns (bool) {
        return IDSProxyFactory(PROXY_FACTORY_ADDR).isProxy(_wallet);
    }

    /// @notice Check if the wallet is a DSA Proxy Account
    function isDSAProxy(address _wallet) public view returns (bool) {
        return IInstaList(DSA_LIST_ADDR).accountID(_wallet) != 0;
    }

    /// @notice Check if the wallet is a Safe Smart Account
    /// @dev This is a 'pseudo' check since we are only checking for the existence of the nonce function
    function isSafe(address _wallet) public view returns (bool) {
        try ISafe(_wallet).nonce() returns (uint256 nonce) {
            return true;
        } catch {
            return false;
        }
    }

    function getWalletType(address _wallet) public view returns (WalletType) {
        /// @dev First check for Safe as it is the most common wallet type
        if (isSafe(_wallet)) {
            return WalletType.SAFE;
        }

        if (isDSProxy(_wallet)) {
            return WalletType.DS_PROXY;
        }

        if (isDSAProxy(_wallet)) {
            return WalletType.DSA_PROXY;
        }

        revert UnsupportedWallet(_wallet);
    }
}