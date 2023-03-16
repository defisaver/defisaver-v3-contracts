// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../../DS/DSMath.sol";
import "./MainnetMorphoAaveV3Addresses.sol";
import "../../../utils/MorphoMarketStorage.sol";
import "../../../interfaces/morpho/IMorphoAaveV3.sol";

contract MorphoAaveV3Helper is MainnetMorphoAaveV3Addresses, DSMath {

    MorphoMarketStorage internal constant morphoMarketStorage = MorphoMarketStorage(MORPHO_MARKET_STORAGE);

    error InvalidEModeId(uint256 _emodeId);

    function getMorphoAddressByEmode(uint256 _emodeId) public view returns (address) {
        address morphoAddr = morphoMarketStorage.getMorphoAddress(_emodeId);

        if (morphoAddr == address(0)) revert InvalidEModeId(_emodeId);

        return morphoAddr;
    }

}