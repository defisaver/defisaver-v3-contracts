// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {MainnetFluidAddresses} from "./MainnetFluidAddresses.sol";

contract FluidHelper is MainnetFluidAddresses {

    function signed256(uint256 x) internal pure returns (int256) {
        require(x <= uint256(type(int256).max));
        return int256(x);
    }
}
