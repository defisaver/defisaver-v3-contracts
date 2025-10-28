// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IInstaList } from "../interfaces/protocols/insta/IInstaList.sol";
import { SmartWalletUtils } from "../utils/SmartWalletUtils.sol";
import { WalletType } from "../utils/DFSTypes.sol";

contract GeneralView is SmartWalletUtils {
    /// @notice Retrieves information about a smart wallet
    /// @param _smartWalletAddress Address of the smart wallet
    /// @return smartWalletType Type of the smart wallet
    /// @return owner Address of the owner of the smart wallet
    function getSmartWalletInfo(address _smartWalletAddress)
        public
        view
        returns (WalletType smartWalletType, address owner)
    {
        smartWalletType = _getWalletType(_smartWalletAddress);
        owner = _fetchOwnerOrWallet(_smartWalletAddress, false);
    }

    /// @notice Fetches the DSA Proxy Accounts for a user
    /// @param _user Address of the user
    /// @return accounts Array of DSA Proxy Accounts
    function fetchDSAProxyAccounts(address _user) public view returns (address[] memory accounts) {
        IInstaList list = IInstaList(DSA_LIST_ADDR);

        IInstaList.UserLink memory userLink = list.userLink(_user);

        accounts = new address[](userLink.count);

        uint64 currentId = userLink.first;
        for (uint64 i = 0; i < userLink.count; i++) {
            accounts[i] = list.accountAddr(currentId);
            currentId = list.userList(_user, currentId).next;
        }
    }
}
