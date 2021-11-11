// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../../../DS/DSMath.sol";
import "../../../interfaces/reflexer/IOracleRelayer.sol";
import "../../../interfaces/reflexer/ISAFEEngine.sol";
import "../../../interfaces/reflexer/ISAFEManager.sol";
import "../../../interfaces/reflexer/IFSMWrapper.sol";
import "./MainnetReflexerAddresses.sol";

/// @title Helper methods for Liquity ratio calc.
contract ReflexerRatioHelper is DSMath, MainnetReflexerAddresses {

    /// @notice Gets Safe CR
    /// @param _safeId Safe ID
    function getRatio(uint256 _safeId) public returns (uint256 ratio) {

        address safeAddr = ISAFEManager(SAFE_MANAGER_ADDRESS).safes(_safeId);
        bytes32 collType = ISAFEManager(SAFE_MANAGER_ADDRESS).collateralTypes(_safeId);

        (uint256 collAmount, uint256 debtAmount) = ISAFEEngine(SAFE_ENGINE_ADDRESS).safes(collType, safeAddr);
        
        (address fsmAddr, uint256 safetyCRatio) =
            IOracleRelayer(ORACLE_RELAYER_ADDRESS).collateralTypes(collType);

        IFSMWrapper fsm = IFSMWrapper(fsmAddr);
        (uint256 collPrice, bool valid) = fsm.getNextResultWithValidity();

        uint256 redemptionPrice;
        if (valid) {
            redemptionPrice = IOracleRelayer(ORACLE_RELAYER_ADDRESS).redemptionPrice();
        }

        if (redemptionPrice == 0) {
            (, , uint256 safetyPrice, , , ) =
                ISAFEEngine(SAFE_ENGINE_ADDRESS).collateralTypes(collType);
            
            uint256 priceRatio = rmul(safetyPrice, safetyCRatio);

            return ratio = rdiv(rmul(collAmount, priceRatio), debtAmount) / 1e9;
        }
        
        return ratio = rdiv(rmul(collPrice, collAmount), rmul(debtAmount, redemptionPrice));
    }
} 