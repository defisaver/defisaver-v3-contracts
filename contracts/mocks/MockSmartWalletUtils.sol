// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { SmartWalletUtils } from "../utils/SmartWalletUtils.sol";

contract MockSmartWalletUtils {
    address immutable smartWalletUtils;

    constructor(address _checkWalletType) {
        smartWalletUtils = _checkWalletType;
    }

    function _isDSProxy(address _proxy) public view returns (bool) {
        return SmartWalletUtils(smartWalletUtils)._isDSProxy(_proxy);
    }
}
