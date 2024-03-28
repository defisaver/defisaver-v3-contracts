// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;


import { ActionsUtils } from "./../ActionsUtils.sol";
import { RegistryUtils } from "./../RegistryUtils.sol";
import { BaseTest } from "./../BaseTest.sol";

contract ExecuteActionsBase is 
    ActionsUtils,
    RegistryUtils,
    BaseTest
{
    bytes4 internal constant EXECUTE_ACTION_DIRECT_SELECTOR = bytes4(keccak256("executeActionDirect(bytes)"));
}
