// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { SmartWalletUtils } from "../utils/SmartWalletUtils.sol";
import { WalletType } from "../utils/DFSTypes.sol";

contract MockSmartWalletUtils is SmartWalletUtils {
    function isDSProxy(address _proxy) public view returns (bool) {
        return super._isDSProxy(_proxy);
    }

    function isDSAProxy(address _proxy) public view returns (bool) {
        return super._isDSAProxy(_proxy);
    }

    function getWalletType(address _proxy) public view returns (WalletType) {
        return super._getWalletType(_proxy);
    }

    function fetchOwnerOrWallet(address _wallet) public view returns (address) {
        return super._fetchOwnerOrWallet(_wallet);
    }
}
