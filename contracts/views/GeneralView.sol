// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../utils/CheckWalletType.sol";
import "../interfaces/IDSProxy.sol";
import "../interfaces/safe/ISafe.sol";

contract GeneralView is CheckWalletType{

    enum WalletType { DSPROXY, SAFE }

    function getSmartWalletInfo(address smartWalletAddress) public view returns (WalletType smartWalletType, address owner) {
        if (isDSProxy(smartWalletAddress))
            return (WalletType.DSPROXY, IDSProxy(payable(smartWalletAddress)).owner());

        // if not DSProxy, we assume we are in context of Safe
        smartWalletType = WalletType.SAFE;

        address[] memory owners = ISafe(smartWalletAddress).getOwners();
        owner = owners.length == 1 ? owners[0] : smartWalletAddress;
    }
}