// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { MainnetInstaConnectorAddresses } from "./MainnetInstaConnectorAddresses.sol";
import { IDFSRegistry } from "../../../interfaces/IDFSRegistry.sol";

contract InstaConnectorHelper is MainnetInstaConnectorAddresses {
    IDFSRegistry internal constant dfsRegistry = IDFSRegistry(DEFISAVER_REGISTRY_ADDR);
    bytes4 internal constant RECIPE_EXECUTOR_ID = bytes4(keccak256("RecipeExecutor"));

    function getDfsRecipeExecutor() internal view returns (address) {
        return dfsRegistry.getAddr(RECIPE_EXECUTOR_ID);
    }
}
