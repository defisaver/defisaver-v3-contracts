// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

interface IFundManager {
    function depositTo(address to, string memory currencyCode, uint256 amount) external;
    function withdraw(string calldata currencyCode, uint256 amount) external returns (uint256);
    function getRawFundBalance(string memory currencyCode) external returns (uint256);
    function rariFundToken() external view returns (address);
    function getFundBalance() external returns (uint256);
}