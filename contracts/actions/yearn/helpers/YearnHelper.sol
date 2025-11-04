// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { MainnetYearnAddresses } from "./MainnetYearnAddresses.sol";
import { IYearnRegistry } from "../../../interfaces/protocols/yearn/IYearnRegistry.sol";

contract YearnHelper is MainnetYearnAddresses {
    IYearnRegistry public constant yearnRegistry = IYearnRegistry(YEARN_REGISTRY_ADDR);
}
