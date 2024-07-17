// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import "forge-std/Test.sol";

import { DFSRegistry } from "../../contracts/core/DFSRegistry.sol";
import { BotAuth } from "../../contracts/core/strategy/BotAuth.sol";
import { CoreHelper } from "../../contracts/core/helpers/CoreHelper.sol";
import { AdminVault } from "../../contracts/auth/AdminAuth.sol";
import { CheatCodes } from "../CheatCodes.sol";

contract RegistryUtils is CoreHelper {
    function redeploy(string memory _actionName, address _newAddr) public {
        DFSRegistry registry = DFSRegistry(REGISTRY_ADDR);
        CheatCodes cheats = CheatCodes(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

        bytes4 actionId = bytes4(keccak256(abi.encodePacked(_actionName)));

        (,uint256 waitPeriod,,,,bool exists) = registry.entries(actionId);

        address owner = AdminVault(registry.adminVault()).owner();

        cheats.startPrank(owner);

        if (exists) {
            registry.startContractChange(actionId, _newAddr);
            // time travel
            cheats.warp(block.timestamp + waitPeriod);
            registry.approveContractChange(actionId);
        } else {
            registry.addNewContract(actionId, _newAddr, 0);
        }

        cheats.stopPrank();
    }

    function getAddr(string memory _name) public view returns (address) {
        DFSRegistry registry = DFSRegistry(REGISTRY_ADDR);

        bytes4 id = bytes4(keccak256(abi.encodePacked(_name)));

        return registry.getAddr(id);
    }

    function addBotCaller(address _newBot) public {
        CheatCodes cheats = CheatCodes(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);
        BotAuth botAuth = BotAuth(getAddr("BotAuth"));

        address owner = AdminVault(botAuth.adminVault()).owner();

        cheats.startPrank(owner);
        botAuth.addCaller(_newBot);
        cheats.stopPrank();
    }

}