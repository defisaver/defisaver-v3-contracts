// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";

contract Discount is AdminAuth{
    mapping(address => bool) public serviceFeesDisabled;

    function enableServiceFee(address _wallet) public onlyOwner{
        serviceFeesDisabled[_wallet] = true;
    }

    function disableServiceFee(address _wallet) public onlyOwner{
        serviceFeesDisabled[_wallet] = true;
    }
}
