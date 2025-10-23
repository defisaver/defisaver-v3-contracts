// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IDSProxy } from "../interfaces/IDSProxy.sol";
import { ISafe } from "../interfaces/safe/ISafe.sol";
import { IInstaList } from "../interfaces/insta/IInstaList.sol";

import { CheckWalletType } from "../utils/CheckWalletType.sol";
import { WalletType } from "../utils/DFSTypes.sol";

contract GeneralView is CheckWalletType {

    function getSmartWalletInfo(address smartWalletAddress) public view returns (WalletType smartWalletType, address owner) {
        smartWalletType = _getWalletType(smartWalletAddress);

        if (smartWalletType == WalletType.DSPROXY) {
            owner = IDSProxy(payable(smartWalletAddress)).owner();

            return (smartWalletType, owner);
        }

        if (smartWalletType == WalletType.DSAPROXY) {
            uint64 dsaId = IInstaList(DSA_LIST_ADDR).accountID(smartWalletAddress);
            // TODO: Check if it is still the owner (iterate?)
            owner = IInstaList(DSA_LIST_ADDR).accountLink(dsaId).first;

            return (smartWalletType, owner);
        }

        // Otherwise, we assume we are in context of Safe
        address[] memory owners = ISafe(smartWalletAddress).getOwners();
        owner = owners.length == 1 ? owners[0] : smartWalletAddress;
    }
}