// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IDSProxyFactory } from "../interfaces/DS/IDSProxyFactory.sol";
import { IInstaList } from "../interfaces/protocols/insta/IInstaList.sol";
import { IInstaAccount } from "../interfaces/protocols/insta/IInstaAccount.sol";
import { IDSProxy } from "../interfaces/DS/IDSProxy.sol";
import { ISafe } from "../interfaces/protocols/safe/ISafe.sol";
import { DSProxyFactoryHelper } from "../utils/addresses/dsProxyFactory/DSProxyFactoryHelper.sol";
import {
    DSAProxyFactoryHelper
} from "../utils/addresses/dsaProxyFactory/DSAProxyFactoryHelper.sol";
import { WalletType } from "../utils/DFSTypes.sol";

/// @title SmartWalletUtils - Helper contract with utility functions for smart wallets
contract SmartWalletUtils is DSProxyFactoryHelper, DSAProxyFactoryHelper {
    /// @notice Determine the type of wallet an address represents
    function _getWalletType(address _wallet) internal view returns (WalletType) {
        if (_isDSProxy(_wallet)) {
            return WalletType.DSPROXY;
        }

        if (_isDSAProxy(_wallet)) {
            return WalletType.DSAPROXY;
        }

        // Otherwise, we assume we are in context of Safe
        return WalletType.SAFE;
    }

    /// @notice Check if the wallet is a DSProxy
    function _isDSProxy(address _wallet) internal view returns (bool) {
        return IDSProxyFactory(PROXY_FACTORY_ADDR).isProxy(_wallet);
    }

    /// @notice Check if the wallet is a DSA Proxy Account
    function _isDSAProxy(address _wallet) internal view returns (bool) {
        return IInstaList(DSA_LIST_ADDR).accountID(_wallet) != 0;
    }

    /// @notice Fetch the owner of the smart wallet or the wallet itself
    /// @dev For 1/1 safe it returns the owner, otherwise it returns the wallet itself
    /// @dev For DSA Proxy Accounts, it returns the first owner if authorized or the wallet itself
    /// @param _wallet Address of the smart wallet
    /// @return Address of the owner or wallet
    function _fetchOwnerOrWallet(address _wallet) internal view returns (address) {
        WalletType walletType = _getWalletType(_wallet);

        if (walletType == WalletType.DSPROXY) {
            return IDSProxy(payable(_wallet)).owner();
        }

        if (walletType == WalletType.DSAPROXY) {
            uint64 dsaId = IInstaList(DSA_LIST_ADDR).accountID(_wallet);
            // TODO: Do we always want this?
            address firstOwner = IInstaList(DSA_LIST_ADDR).accountLink(dsaId).first;
            return firstOwner != address(0) ? firstOwner : _wallet;
        }

        // Otherwise, we assume we are in context of Safe
        address[] memory owners = ISafe(_wallet).getOwners();
        return owners.length == 1 ? owners[0] : _wallet;
    }
}
