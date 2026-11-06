// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    IExchangeAggregatorRegistry
} from "../../interfaces/exchange/IExchangeAggregatorRegistry.sol";
import { IWrapperExchangeRegistry } from "../../interfaces/exchange/IWrapperExchangeRegistry.sol";
import { MainnetExchangeAddresses } from "./MainnetExchangeAddresses.sol";

contract ExchangeHelper is MainnetExchangeAddresses {
    IExchangeAggregatorRegistry internal constant _exchangeAggRegistry =
        IExchangeAggregatorRegistry(EXCHANGE_AGGREGATOR_REGISTRY_ADDR);
    IWrapperExchangeRegistry internal constant _wrapperRegistry =
        IWrapperExchangeRegistry(WRAPPER_EXCHANGE_REGISTRY);
}
