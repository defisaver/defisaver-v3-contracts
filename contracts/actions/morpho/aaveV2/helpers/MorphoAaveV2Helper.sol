// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IMorphoAaveV2Lens } from "../../../../interfaces/morpho/IMorphoAaveV2Lens.sol";
import { MorphoTypes } from "../../../../interfaces/morpho/MorphoTypes.sol";
import { DSMath } from "../../../../DS/DSMath.sol";
import { MainnetMorphoAaveV2Addresses } from "./MainnetMorphoAaveV2Addresses.sol";

contract MorphoAaveV2Helper is MainnetMorphoAaveV2Addresses, DSMath {
    function getSafetyRatio(address _usr) internal view returns (uint256) {
        MorphoTypes.LiquidityData memory liqData = IMorphoAaveV2Lens(MORPHO_AAVEV2_LENS_ADDR).getUserHypotheticalBalanceStates(_usr, address(0), 0, 0);
        return wdiv(liqData.borrowableEth, liqData.debtEth);
    }
}