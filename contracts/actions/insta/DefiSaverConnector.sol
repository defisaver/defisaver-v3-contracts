// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../../auth/AdminAuth.sol";
import { DFSRegistry } from "../../core/DFSRegistry.sol";

contract DefiSaverConnector is AdminAuth {

    address internal constant REGISTRY_ADDR = 0x287778F121F134C66212FB16c9b53eC991D32f5b;
    bytes4 internal constant RECIPE_EXECUTOR_ID = bytes4(keccak256("RecipeExecutor"));

    function execute(bytes memory _data)
        public
        payable
        returns (bytes memory response)
    {
        address recipeExecutor = DFSRegistry(REGISTRY_ADDR).getAddr(RECIPE_EXECUTOR_ID);

        // call contract in current context
        assembly {
            let succeeded := delegatecall(sub(gas(), 5000), recipeExecutor, add(_data, 0x20), mload(_data), 0, 0)
            let size := returndatasize()

            response := mload(0x40)
            mstore(0x40, add(response, and(add(add(size, 0x20), 0x1f), not(0x1f))))
            mstore(response, size)
            returndatacopy(add(response, 0x20), 0, size)

            switch iszero(succeeded)
            case 1 {
                // throw if delegatecall failed
                revert(add(response, 0x20), size)
            }
        }
    }
}
