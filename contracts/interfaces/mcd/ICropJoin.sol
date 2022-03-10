// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

import "./IJoin.sol";

abstract contract ICropJoin is IJoin {
    function bonus() external virtual returns (IGem);
}
