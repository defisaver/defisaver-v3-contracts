// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IMkrSkyConverter {
    function skyToMkr(address usr, uint256 skyAmt) external;
    function mkrToSky(address usr, uint256 mkrAmt) external;
    function rate() external returns (uint256);
}
