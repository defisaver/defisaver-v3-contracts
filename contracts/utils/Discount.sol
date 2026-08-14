// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IDiscount } from "../interfaces/utils/IDiscount.sol";
import { AdminAuth } from "../auth/AdminAuth.sol";

/// @title Contract used to check if a DFS user is exempt from paying a service fee
contract Discount is AdminAuth, IDiscount {
    mapping(address => bool) public serviceFeesDisabled;

    function reenableServiceFee(address _wallet) public onlyOwner {
        serviceFeesDisabled[_wallet] = false;
    }

    function disableServiceFee(address _wallet) public onlyOwner {
        serviceFeesDisabled[_wallet] = true;
    }
}
