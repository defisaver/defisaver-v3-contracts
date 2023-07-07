// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "./MainnetAaveV3LSVAddresses.sol";
import "../../../../interfaces/ILSVProfitTracker.sol";

/// @title Utility functions and data used in AaveV3 actions
contract AaveV3LSVHelper is MainnetAaveV3LSVAddresses {
    bytes4 internal constant AAVEV3_PROFIT_TRACKER_ID = 0x10b2e77c;
}