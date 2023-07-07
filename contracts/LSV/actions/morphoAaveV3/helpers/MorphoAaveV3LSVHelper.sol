// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "./MainnetMorphoAaveV3LSVAddresses.sol";
import "../../../../interfaces/ILSVProfitTracker.sol";

/// @title Utility functions and data used in AaveV3 actions
contract MorphoAaveV3LSVHelper is MainnetMorphoAaveV3LSVAddresses {
    bytes4 internal constant MORPHO_AAVEV3_PROFIT_TRACKER_ID = 0x92f28851;
}