// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import {Vm} from "forge-std/Vm.sol";

// @title CheatCodes - Wrapper for the Vm contract from forge-std
contract CheatCodes {
    Vm internal cheats = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
}