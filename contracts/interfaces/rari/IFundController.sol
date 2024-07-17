// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IFundController {
    function fuseAssets(uint8,string memory) external view returns (address);
}
