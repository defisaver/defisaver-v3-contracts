// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "./MainnetYearnAddresses.sol";
import "../../../interfaces/yearn/IYearnRegistry.sol";

contract YearnHelper is MainnetYearnAddresses {

    IYearnRegistry public constant yearnRegistry =
        IYearnRegistry(YEARN_REGISTRY_ADDR);
}