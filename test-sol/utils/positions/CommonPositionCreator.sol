// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

contract CommonPositionCreator {

    struct PositionParams {
        address collAddr;
        uint256 collAmount;
        address debtAddr;
        uint256 debtAmount;
    }
}
