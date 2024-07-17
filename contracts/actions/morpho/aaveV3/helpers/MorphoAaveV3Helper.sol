// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { DSMath } from "../../../../DS/DSMath.sol";
import { MainnetMorphoAaveV3Addresses } from "./MainnetMorphoAaveV3Addresses.sol";
import { MorphoMarketStorage } from "../../../../utils/MorphoMarketStorage.sol";
import { IMorphoAaveV3 } from "../../../../interfaces/morpho/IMorphoAaveV3.sol";
import { Types } from "../../../../interfaces/morpho/MorphoTypesAaveV3.sol";

contract MorphoAaveV3Helper is MainnetMorphoAaveV3Addresses, DSMath {

    MorphoMarketStorage internal constant morphoMarketStorage = MorphoMarketStorage(MORPHO_MARKET_STORAGE);

    error InvalidEModeId(uint256 _emodeId);

    function getMorphoAddressByEmode(uint256 _emodeId) public view returns (address) {
        address morphoAddr = morphoMarketStorage.getMorphoAddress(_emodeId);

        if (morphoAddr == address(0)) revert InvalidEModeId(_emodeId);

        return morphoAddr;
    }

    function getSafetyRatio(address _morphoAddr, address _usr) internal view returns (uint256) {
        Types.LiquidityData memory liqData = IMorphoAaveV3(_morphoAddr).liquidityData(_usr);
        if (liqData.debt == 0) return 0;
        return wdiv(liqData.borrowable, liqData.debt);
    }
}