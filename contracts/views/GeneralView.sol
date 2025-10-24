// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { SmartWalletUtils } from "../utils/SmartWalletUtils.sol";
import { WalletType } from "../utils/DFSTypes.sol";

contract GeneralView is SmartWalletUtils {

    /// @notice Retrieves information about a smart wallet
    /// @param _smartWalletAddress Address of the smart wallet
    /// @return smartWalletType Type of the smart wallet
    /// @return owner Address of the owner of the smart wallet
    function getSmartWalletInfo(address _smartWalletAddress) public view returns (WalletType smartWalletType, address owner) {
        smartWalletType = _getWalletType(_smartWalletAddress);
        owner = _fetchOwnerOrWallet(_smartWalletAddress);
    }
}
