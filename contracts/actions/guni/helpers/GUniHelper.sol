// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

import "./MainnetGUniAddresses.sol";
import "../../../interfaces/guni/IGUniRouter02.sol";


/// @title Utility functions and data used in AaveV2 actions
contract GUniHelper is MainnetGUniAddresses{
    IGUniRouter02 public constant gUniRouter = IGUniRouter02(G_UNI_ROUTER_02_ADDRESS);
}