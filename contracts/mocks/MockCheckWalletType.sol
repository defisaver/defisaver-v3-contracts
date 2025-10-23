// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { CheckWalletType } from "../utils/CheckWalletType.sol";
import { WalletType } from "../utils/DFSTypes.sol";

contract MockCheckWalletType is CheckWalletType {
    function isDSProxy(address _proxy) public view returns (bool) {
        return super._isDSProxy(_proxy);
    }

    function isDSAProxy(address _proxy) public view returns (bool) {
        return super._isDSAProxy(_proxy);
    }

    function getWalletType(address _proxy) public view returns (WalletType) {
        return super._getWalletType(_proxy);
    }
}
