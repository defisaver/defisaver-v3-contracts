// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

import "../auth/AdminAuth.sol";

contract ExchangeAggregatorsAllowlist is AdminAuth {
    mapping(address => bool) public exchAggrAllowlist;

    constructor() {
        exchAggrAllowlist[0x6958F5e95332D93D21af0D7B9Ca85B8212fEE0A5] = true;
        exchAggrAllowlist[0x61935CbDd02287B511119DDb11Aeb42F1593b7Ef] = true;
        exchAggrAllowlist[0xDef1C0ded9bec7F1a1670819833240f027b25EfF] = true;
        exchAggrAllowlist[0x080bf510FCbF18b91105470639e9561022937712] = true;
    }

    function setAllowlistAddr(address _exchAddr, bool _state) public onlyOwner {
        exchAggrAllowlist[_exchAddr] = _state;
    }

    function isAllowedAddr(address _exchAddr) public view returns (bool) {
        return exchAggrAllowlist[_exchAddr];
    }
}
