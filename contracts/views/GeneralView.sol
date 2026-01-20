// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IInstaList } from "../interfaces/protocols/insta/IInstaList.sol";
import {
    IAccountImplementation
} from "../interfaces/protocols/summerfi/IAccountImplementation.sol";

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

        // DSA Proxy accounts are intentionally handled separately from '_fetchOwnerOrWallet'
        if (smartWalletType == WalletType.DSAPROXY) {
            owner = _fetchDSAProxyOwner(_smartWalletAddress);
        } else if (smartWalletType == WalletType.SFPROXY) {
            owner = _fetchSFProxyOwner(_smartWalletAddress);
        } else {
            owner = _fetchOwnerOrWallet(_smartWalletAddress);
        }
    }

    function _fetchDSAProxyOwner(address _dsaProxy) internal view returns (address) {
        uint64 dsaId = IInstaList(DSA_LIST_ADDR).accountID(_dsaProxy);
        return IInstaList(DSA_LIST_ADDR).accountLink(dsaId).first;
    }

    function _fetchSFProxyOwner(address _sfProxy) internal view returns (address) {
        return IAccountImplementation(_sfProxy).owner();
    }
}
