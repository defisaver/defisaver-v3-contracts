// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

abstract contract IMCDPriceVerifier {
    function verifyVaultNextPrice(uint256 _nextPrice, uint256 _cdpId) public view virtual returns (bool);
    function verifyNextPrice(uint256 _nextPrice, bytes32 _ilk) public view virtual returns (bool);
    function setAuthorized(address _address, bool _allowed) public virtual;
}
