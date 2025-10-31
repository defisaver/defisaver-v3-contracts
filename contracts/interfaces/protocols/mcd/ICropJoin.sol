// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IJoin } from "./IJoin.sol";
import { IGem } from "./IGem.sol";

abstract contract ICropJoin is IJoin {
    function bonus() external virtual returns (IGem);
}
