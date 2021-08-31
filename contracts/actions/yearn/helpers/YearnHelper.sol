// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

import "./MainnetYearnHelper.sol";
import "../../../interfaces/yearn/IYearnRegistry.sol";

contract YearnHelper is MainnetYearnHelper {

    IYearnRegistry public constant yearnRegistry =
        IYearnRegistry(YEARN_REGISTRY_ADDR);
}