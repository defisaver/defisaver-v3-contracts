// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../../../DS/DSMath.sol";
import "../../../interfaces/reflexer/IOracleRelayer.sol";
import "../../../interfaces/reflexer/ISAFEEngine.sol";
import "../../../interfaces/reflexer/ISAFEManager.sol";

/// @title Helper methods for Liquity ratio calc.
contract ReflexerRatioHelper is DSMath {
    address public constant MANAGER_ADDR = 0xEfe0B4cA532769a3AE758fD82E1426a03A94F185;
    address public constant SAFE_ENGINE_ADDRESS = 0xCC88a9d330da1133Df3A7bD823B95e52511A6962;
    address public constant ORACLE_RELAYER_ADDRESS = 0x4ed9C0dCa0479bC64d8f4EB3007126D5791f7851;

    /// @notice Gets Safe CR
    /// @param _safeId Safe ID
    function getRatio(uint256 _safeId) public view returns (uint256 ratio) {

        address safeAddr = ISAFEManager(MANAGER_ADDR).safes(_safeId);
        bytes32 collType = ISAFEManager(MANAGER_ADDR).collateralTypes(_safeId);

        (uint256 collAmount, uint256 debtAmount) = ISAFEEngine(SAFE_ENGINE_ADDRESS).safes(collType, safeAddr);
        
        (, uint256 safetyCRatio) =
            IOracleRelayer(ORACLE_RELAYER_ADDRESS).collateralTypes(collType);
        
        (, , uint256 safetyPrice, , , ) =
            ISAFEEngine(SAFE_ENGINE_ADDRESS).collateralTypes(collType);
        
        uint256 priceRatio = rmul(safetyPrice, safetyCRatio);

        ratio = rdiv(rmul(collAmount, priceRatio), debtAmount) / 1e9;
    }
} 