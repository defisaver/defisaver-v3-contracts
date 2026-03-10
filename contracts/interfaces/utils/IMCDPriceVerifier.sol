// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IMCDPriceVerifier {
    function verifyVaultNextPrice(uint256 _nextPrice, uint256 _cdpId) external view returns (bool);
    function verifyNextPrice(uint256 _nextPrice, bytes32 _ilk) external view returns (bool);
    function setAuthorized(address _address, bool _allowed) external;
}
