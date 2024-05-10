// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { CheckWalletType } from "../utils/CheckWalletType.sol";

contract MockCheckWalletType {

    address immutable checkWalletType;

    constructor(address _checkWalletType) {
        checkWalletType = _checkWalletType;
    }

    function isDSProxy(address _proxy) public view returns (bool) {
        return CheckWalletType(checkWalletType).isDSProxy(_proxy);
    }
}
