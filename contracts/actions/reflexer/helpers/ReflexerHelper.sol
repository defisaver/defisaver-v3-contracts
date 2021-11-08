// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../../../DS/DSMath.sol";
import "../../../interfaces/reflexer/ISAFEEngine.sol";
import "../../../interfaces/reflexer/ISAFEManager.sol";
import "../../../interfaces/reflexer/IBasicTokenAdapters.sol";
import "../../../interfaces/reflexer/ISAFESaviour.sol";
import "./MainnetReflexerAddresses.sol";

/// @title Helper methods for MCDSaverProxy
contract ReflexerHelper is DSMath, MainnetReflexerAddresses {

    ISAFEEngine public constant safeEngine = ISAFEEngine(SAFE_ENGINE_ADDRESS);
    ISAFEManager public constant safeManager = ISAFEManager(SAFE_MANAGER_ADDRESS);

    error IntOverflow();
    
    /// @notice Returns the underlying token address from the adapterAddr
    /// @param _adapterAddr  address to check
    function getTokenFromAdapter(address _adapterAddr) internal view returns (address) {
        return address(IBasicTokenAdapters(_adapterAddr).collateral());
    }

    /// @notice Converts a number to 18 decimal precision
    /// @dev If token decimal is bigger than 18, function reverts
    /// @param _adapterAddr Adapter address of the collateral
    /// @param _amount Number to be converted
    function convertTo18(address _adapterAddr, uint256 _amount) internal view returns (uint256) {
        return _amount * (10 ** (18 - IBasicTokenAdapters(_adapterAddr).decimals()));
    }

    /// @notice Converts a uint to int and checks if positive
    /// @param _x Number to be converted
    function toPositiveInt(uint256 _x) internal pure returns (int256 y) {
        y = int256(_x);
        if (y < 0){
            revert IntOverflow();
        }
    }

    /// @notice Converts a number to Rad precision
    /// @param _wad The input number in wad precision
    function toRad(uint256 _wad) internal pure returns (uint256) {
        return _wad * RAY;
    }
}
