// SPDX-License-Identifier: MIT

pragma solidity =0.8.27;

interface IDaiUSDSConverter {
    function usdsToDai(address usr, uint256 wad) external;
    function daiToUsds(address usr, uint256 wad) external;
}
