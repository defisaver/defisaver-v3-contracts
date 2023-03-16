// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../../DS/DSMath.sol";
import "./MainnetMorphoAaveV3Addresses.sol";
import "../../../interfaces/morpho/IMorphoAaveV3View.sol";
import "../../../interfaces/morpho/IMorphoAaveV3.sol";

contract MorphoAaveV3Helper is MainnetMorphoAaveV3Addresses, DSMath {

    IMorphoAaveV3View internal constant morphoAaveV3View = IMorphoAaveV3View(MORPHO_AAVE_V3_VIEW);

    error InvalidEModeId(uint256 _emodeId);

    function getMorphoAddressByEmode(uint256 _emodeId) public view returns (address) {
        address morphoAddr = morphoAaveV3View.getMorphoAddress(_emodeId);

        if (morphoAddr == address(0)) revert InvalidEModeId(_emodeId);

        return morphoAddr;
    }

}