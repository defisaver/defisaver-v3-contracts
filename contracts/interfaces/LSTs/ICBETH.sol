// SPDX-License-Identifier: MIT

pragma solidity =0.8.27;

interface ICBETH {
    function exchangeRate() external view returns (uint256 wethAmountPerCBETH);
}