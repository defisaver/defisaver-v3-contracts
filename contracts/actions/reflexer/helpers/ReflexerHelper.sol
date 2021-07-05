// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

import "../../../DS/DSMath.sol";
import "../../../interfaces/reflexer/ISAFEEngine.sol";
import "../../../interfaces/reflexer/ISAFEManager.sol";
import "../../../interfaces/reflexer/IBasicTokenAdapters.sol";
import "../../../interfaces/reflexer/ISAFESaviour.sol";

/// @title Helper methods for MCDSaverProxy
contract ReflexerHelper is DSMath {
    address public constant RAI_ADDRESS = 0x03ab458634910AaD20eF5f1C8ee96F1D6ac54919;
    address public constant RAI_ADAPTER_ADDRESS = 0x0A5653CCa4DB1B6E265F47CAf6969e64f1CFdC45;

    address public constant SAFE_ENGINE_ADDRESS = 0xCC88a9d330da1133Df3A7bD823B95e52511A6962;
    address public constant SAFE_MANAGER_ADDRESS = 0xEfe0B4cA532769a3AE758fD82E1426a03A94F185;

    ISAFEEngine public constant safeEngine = ISAFEEngine(SAFE_ENGINE_ADDRESS);
    ISAFEManager public constant safeManager = ISAFEManager(SAFE_MANAGER_ADDRESS);

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
        return mul(_amount, 10**sub(18, IBasicTokenAdapters(_adapterAddr).decimals()));
    }

    /// @notice Converts a uint to int and checks if positive
    /// @param _x Number to be converted
    function toPositiveInt(uint256 _x) internal pure returns (int256 y) {
        y = int256(_x);
        require(y >= 0, "int-overflow");
    }

    /// @notice Converts a number to Rad precision
    /// @param _wad The input number in wad precision
    function toRad(uint256 _wad) internal pure returns (uint256) {
        return mul(_wad, RAY);
    }
}
