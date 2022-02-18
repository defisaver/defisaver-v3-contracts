// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

interface IFundController {
    function fuseAssets(uint8,string memory) external view returns (address);
}
