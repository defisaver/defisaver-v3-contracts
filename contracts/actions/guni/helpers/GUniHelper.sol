// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { MainnetGUniAddresses } from "./MainnetGUniAddresses.sol";
import { IGUniRouter02 } from "../../../interfaces/guni/IGUniRouter02.sol";


/// @title Utility functions and data used in GUni actions
contract GUniHelper is MainnetGUniAddresses{
    IGUniRouter02 public constant gUniRouter = IGUniRouter02(G_UNI_ROUTER_02_ADDRESS);
}