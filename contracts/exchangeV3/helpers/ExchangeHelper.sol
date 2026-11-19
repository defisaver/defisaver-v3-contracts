// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    IExchangeAggregatorRegistry
} from "../../interfaces/exchange/IExchangeAggregatorRegistry.sol";
import { IWrapperExchangeRegistry } from "../../interfaces/exchange/IWrapperExchangeRegistry.sol";
import { IDFSRegistry } from "../../interfaces/core/IDFSRegistry.sol";
import { DFSIds } from "../../utils/DFSIds.sol";
import { MainnetExchangeAddresses } from "./MainnetExchangeAddresses.sol";

contract ExchangeHelper is MainnetExchangeAddresses {
    function _getExchangeAggregatorRegistry() internal view returns (IExchangeAggregatorRegistry) {
        return IExchangeAggregatorRegistry(
            IDFSRegistry(DFS_REGISTRY_ADDR).getAddr(DFSIds.EXCHANGE_AGGREGATOR_REGISTRY)
        );
    }

    function _getWrapperExchangeRegistry() internal view returns (IWrapperExchangeRegistry) {
        return IWrapperExchangeRegistry(
            IDFSRegistry(DFS_REGISTRY_ADDR).getAddr(DFSIds.WRAPPER_EXCHANGE_REGISTRY)
        );
    }
}
