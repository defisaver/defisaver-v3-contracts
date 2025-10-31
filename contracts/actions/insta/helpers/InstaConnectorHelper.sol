// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { MainnetInstaConnectorAddresses } from "./MainnetInstaConnectorAddresses.sol";
import { IDFSRegistry } from "../../../interfaces/core/IDFSRegistry.sol";
import { DFSIds } from "../../../utils/DFSIds.sol";

contract InstaConnectorHelper is MainnetInstaConnectorAddresses {
    IDFSRegistry internal constant dfsRegistry = IDFSRegistry(DEFISAVER_REGISTRY_ADDR);

    function getDfsRecipeExecutor() internal view returns (address) {
        return dfsRegistry.getAddr(DFSIds.RECIPE_EXECUTOR);
    }
}
