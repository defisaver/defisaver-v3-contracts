// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

abstract contract IMCDPriceVerifier {
    function verifyVaultNextPrice(uint _nextPrice, uint _cdpId) public view virtual returns(bool);
    function verifyNextPrice(uint _nextPrice, bytes32 _ilk) public view virtual returns(bool);
    function setAuthorized(address _address, bool _allowed) public virtual;
}