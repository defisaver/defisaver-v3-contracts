// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "./AdminAuth.sol";

contract Auth is AdminAuth {
    bool public ALL_AUTHORIZED = false;

    mapping(address => bool) public authorized;

    modifier onlyAuthorized() {
        require(ALL_AUTHORIZED || authorized[msg.sender], "Not authorized");
        _;
    }

    constructor() {
        authorized[msg.sender] = true;
    }

    function setAuthorized(address _user, bool _approved) public onlyOwner {
        authorized[_user] = _approved;
    }

    function setAllAuthorized(bool _authorized) public onlyOwner {
        ALL_AUTHORIZED = _authorized;
    }
}
