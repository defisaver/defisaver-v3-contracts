// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "./MainnetFLAddresses.sol";
import "../../../utils/FLFeeFaucet.sol";

contract FLHelper is MainnetFLAddresses {
    FLFeeFaucet public constant flFeeFaucet = FLFeeFaucet(DYDX_FL_FEE_FAUCET);
}