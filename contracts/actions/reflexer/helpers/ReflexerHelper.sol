// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

import "../../../DS/DSMath.sol";
import "../../../interfaces/reflexer/ISAFEEngine.sol";
import "../../../interfaces/reflexer/ISAFEManager.sol";
import "../../../interfaces/reflexer/IBasicTokenAdapters.sol";

/// @title Helper methods for MCDSaverProxy
contract ReflexerHelper is DSMath {

    address public constant RAI_ADDRESS = 0x03ab458634910AaD20eF5f1C8ee96F1D6ac54919;
    address public constant RAI_JOIN_ADDRESS = 0x0A5653CCa4DB1B6E265F47CAf6969e64f1CFdC45;

    address public constant SAFE_ENGINE_ADDRESS = 0xCC88a9d330da1133Df3A7bD823B95e52511A6962;
    address public constant SAFE_MANAGER_ADDRESS = 0xEfe0B4cA532769a3AE758fD82E1426a03A94F185;

    ISAFEEngine public constant safeEngine = ISAFEEngine(SAFE_ENGINE_ADDRESS);
    ISAFEManager public constant safeManager = ISAFEManager(SAFE_MANAGER_ADDRESS);

    /// @notice Returns the underlying token address from the adapterAddr
    /// @param _adapterAddr Join address to check
    function getTokenFromAdapter(address _adapterAddr) internal view returns (address) {
        return address(IBasicTokenAdapters(_adapterAddr).collateral());
    }


    /// @notice Converts a number to 18 decimal precision
    /// @dev If token decimal is bigger than 18, function reverts
    /// @param _joinAddr Join address of the collateral
    /// @param _amount Number to be converted
    function convertTo18(address _joinAddr, uint256 _amount) internal view returns (uint256) {
        return mul(_amount, 10 ** sub(18 , IBasicTokenAdapters(_joinAddr).decimals()));
    }

    /// @notice Converts a uint to int and checks if positive
    /// @param _x Number to be converted
    function toPositiveInt(uint _x) internal pure returns (int y) {
        y = int(_x);
        require(y >= 0, "int-overflow");
    }

    /// @notice Converts a number to Rad precision
    /// @param _wad The input number in wad precision
    function toRad(uint _wad) internal pure returns (uint) {
        return mul(_wad, 10 ** 27);
    }

    /// @notice Returns a normalized debt _amount based on the current rate
    /// @param _amount Amount of rai to be normalized
    /// @param _rate Current rate of the stability fee
    /// @param _raiVatBalance Balance od Rai in the Safe
    function normalizeDrawAmount(uint _amount, uint _rate, uint _raiVatBalance) internal pure returns (int dart) {
        if (_raiVatBalance < mul(_amount, RAY)) {
            dart = toPositiveInt(sub(mul(_amount, RAY), _raiVatBalance) / _rate);
            dart = mul(uint(dart), _rate) < mul(_amount, RAY) ? dart + 1 : dart;
        }
    }

    /// @notice Gets the whole debt of the Safe
    /// @param _safeEngine Address of Vat contract
    /// @param _usr Address of the Dai holder
    /// @param _urn Urn of the Safe
    /// @param _collType CollType of the Safe
    function getAllDebt(address _safeEngine, address _usr, address _urn, bytes32 _collType) internal view returns (uint raiAmount) {
        (, uint rate,,,,) = ISAFEEngine(_safeEngine).collateralTypes(_collType);
        (, uint art) = ISAFEEngine(_safeEngine).safes(_collType, _urn);
        uint rai = ISAFEEngine(_safeEngine).coinBalance(_usr);

        uint rad = sub(mul(art, rate), rai);
        raiAmount = rad / RAY;

        raiAmount = mul(raiAmount, RAY) < rad ? raiAmount + 1 : raiAmount;
    }

    function _getRepaidDeltaDebt(
        uint coin,
        address safe,
        bytes32 collateralType
    ) internal view returns (int deltaDebt) {
        // Gets actual rate from the safeEngine
        (, uint rate,,,,) = safeEngine.collateralTypes(collateralType);
        require(rate > 0, "invalid-collateral-type");

        // Gets actual generatedDebt value of the safe
        (, uint generatedDebt) = safeEngine.safes(collateralType, safe);

        // Uses the whole coin balance in the safeEngine to reduce the debt
        deltaDebt = toPositiveInt(coin / rate);
        // Checks the calculated deltaDebt is not higher than safe.generatedDebt (total debt), otherwise uses its value
        deltaDebt = uint(deltaDebt) <= generatedDebt ? - deltaDebt : - toPositiveInt(generatedDebt);
    }

}