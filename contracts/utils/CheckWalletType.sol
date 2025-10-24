// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IDSProxyFactory } from "../interfaces/IDSProxyFactory.sol";
import { ISafe } from "../interfaces/safe/ISafe.sol";
import { IInstaList } from "../interfaces/insta/IInstaList.sol";
import { IAccountImplementation } from "../interfaces/summerfi/IAccountImplementation.sol";
import { DSProxyFactoryHelper } from "./ds-proxy-factory/DSProxyFactoryHelper.sol";
import { DSAProxyFactoryHelper } from "./dsa-proxy-factory/DSAProxyFactoryHelper.sol";
import { WalletType } from "../utils/DFSTypes.sol";

/// @title CheckWalletType - Helper contract to check which type of wallet an address represents
contract CheckWalletType is DSProxyFactoryHelper, DSAProxyFactoryHelper {

    /// @notice Check if the wallet is a DSProxy
    function isDSProxy(address _wallet) public view returns (bool) {
        return IDSProxyFactory(PROXY_FACTORY_ADDR).isProxy(_wallet);
    }

    /// @notice Check if the wallet is a DSA Proxy Account
    function isDSAProxy(address _wallet) public view returns (bool) {
        return IInstaList(DSA_LIST_ADDR).accountID(_wallet) != 0;
    }

    /// @notice Check if the wallet is a Summerfi account
    function isSummerfiAccount(address _wallet) public view returns (bool) {
        try IAccountImplementation(_wallet).guard() returns (address guard) {
            return guard != address(0);
        } catch {
            return false;
        }
    }

    function getWalletType(address _wallet) public view returns (WalletType) {
        if (isDSProxy(_wallet)) {
            return WalletType.DSPROXY;
        }

        if (isDSAProxy(_wallet)) {
            return WalletType.DSAPROXY;
        }

        if (isSummerfiAccount(_wallet)) {
            return WalletType.SUMMERFI;
        }

        // Otherwise, we assume we are in context of Safe
        return WalletType.SAFE;
    }
}