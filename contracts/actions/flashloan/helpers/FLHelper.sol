// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "./MainnetFLAddresses.sol";
import "../../../utils/FLFeeFaucet.sol";

contract FLHelper is MainnetFLAddresses {
    uint16 internal constant AAVE_REFERRAL_CODE = 64;
    FLFeeFaucet public constant flFeeFaucet = FLFeeFaucet(DYDX_FL_FEE_FAUCET);
}