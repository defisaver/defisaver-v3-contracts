// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;


import { ActionsUtils } from "./../ActionsUtils.sol";
import { SmartWallet } from "./../SmartWallet.sol";
import { RegistryUtils } from "./../RegistryUtils.sol";

contract ExecuteActionsBase is 
    ActionsUtils,
    SmartWallet,
    RegistryUtils 
{
    bytes4 internal constant EXECUTE_ACTION_DIRECT_SELECTOR = bytes4(keccak256("executeActionDirect(bytes)"));
}
