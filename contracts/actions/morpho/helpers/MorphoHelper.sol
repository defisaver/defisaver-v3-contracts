// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../../interfaces/morpho/IMorphoAaveV2Lens.sol";
import "../../../interfaces/morpho/MorphoTypes.sol";
import "../../../DS/DSMath.sol";
import "./MainnetMorphoAddresses.sol";

contract MorphoHelper is MainnetMorphoAddresses, DSMath {
    function getSafetyRatio(address _usr) public view returns (uint256) {
        Types.LiquidityData memory liqData = IMorphoAaveV2Lens(MORPHO_AAVEV2_LENS_ADDR).getUserHypotheticalBalanceStates(_usr, address(0), 0, 0);
        return wdiv(liqData.borrowableEth, liqData.debtEth);
    }
}