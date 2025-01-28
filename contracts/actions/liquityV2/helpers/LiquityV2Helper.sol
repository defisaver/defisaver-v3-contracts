// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {MainnetLiquityV2Addresses} from "./MainnetLiquityV2Addresses.sol";

contract LiquityV2Helper is MainnetLiquityV2Addresses {

    // Amount of ETH to be locked in gas pool on opening troves
    uint256 constant ETH_GAS_COMPENSATION = 0.0375 ether;

    // Minimum amount of net Bold debt a trove must have
    uint256 constant MIN_DEBT = 2000e18;
}
