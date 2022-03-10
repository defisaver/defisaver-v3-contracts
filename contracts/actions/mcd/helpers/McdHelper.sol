// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

import "../../../DS/DSMath.sol";
import "../../../DS/DSProxy.sol";
import "../../../interfaces/mcd/IManager.sol";
import "../../../interfaces/mcd/IJoin.sol";
import "../../../interfaces/mcd/IVat.sol";
import "../../../utils/TokenUtils.sol";
import "../../../interfaces/mcd/ICdpRegistry.sol";
import "./MainnetMcdAddresses.sol";

/// @title Helper methods for MCDSaverProxy
contract McdHelper is DSMath, MainnetMcdAddresses {

    IVat public constant vat = IVat(VAT_ADDR);

    /// @notice Returns a normalized debt _amount based on the current rate
    /// @param _amount Amount of dai to be normalized
    /// @param _rate Current rate of the stability fee
    /// @param _daiVatBalance Balance od Dai in the Vat for that CDP
    function normalizeDrawAmount(uint _amount, uint _rate, uint _daiVatBalance) internal pure returns (int dart) {
        if (_daiVatBalance < mul(_amount, RAY)) {
            dart = toPositiveInt(sub(mul(_amount, RAY), _daiVatBalance) / _rate);
            dart = mul(uint(dart), _rate) < mul(_amount, RAY) ? dart + 1 : dart;
        }
    }

    /// @notice Converts a number to Rad precision
    /// @param _wad The input number in wad precision
    function toRad(uint _wad) internal pure returns (uint) {
        return mul(_wad, 10 ** 27);
    }

    /// @notice Converts a number to 18 decimal precision
    /// @dev If token decimal is bigger than 18, function reverts
    /// @param _joinAddr Join address of the collateral
    /// @param _amount Number to be converted
    function convertTo18(address _joinAddr, uint256 _amount) internal view returns (uint256) {
        return mul(_amount, 10 ** sub(18 , IJoin(_joinAddr).dec()));
    }

    /// @notice Converts a uint to int and checks if positive
    /// @param _x Number to be converted
    function toPositiveInt(uint _x) internal pure returns (int y) {
        y = int(_x);
        require(y >= 0, "int-overflow");
    }

    /// @notice Gets Dai amount in Vat which can be added to Cdp
    /// @param _vat Address of Vat contract
    /// @param _urn Urn of the Cdp
    /// @param _ilk Ilk of the Cdp
    function normalizePaybackAmount(address _vat, address _urn, bytes32 _ilk) internal view returns (int amount) {
        uint dai = IVat(_vat).dai(_urn);

        (, uint rate,,,) = IVat(_vat).ilks(_ilk);
        (, uint art) = IVat(_vat).urns(_ilk, _urn);

        amount = toPositiveInt(dai / rate);
        amount = uint(amount) <= art ? - amount : - toPositiveInt(art);
    }

    /// @notice Gets the whole debt of the CDP
    /// @param _vat Address of Vat contract
    /// @param _usr Address of the Dai holder
    /// @param _urn Urn of the Cdp
    /// @param _ilk Ilk of the Cdp
    function getAllDebt(address _vat, address _usr, address _urn, bytes32 _ilk) internal view returns (uint daiAmount) {
        (, uint rate,,,) = IVat(_vat).ilks(_ilk);
        (, uint art) = IVat(_vat).urns(_ilk, _urn);
        uint dai = IVat(_vat).dai(_usr);

        uint rad = sub(mul(art, rate), dai);
        daiAmount = rad / RAY;

        // handles precision error (off by 1 wei)
        daiAmount = mul(daiAmount, RAY) < rad ? daiAmount + 1 : daiAmount;
    }

    /// @notice Checks if the join address is one of the Ether coll. types
    /// @param _joinAddr Join address to check
    function isEthJoinAddr(address _joinAddr) internal view returns (bool) {
        // if it's dai_join_addr don't check gem() it will fail
        if (_joinAddr == DAI_JOIN_ADDR) return false;

        // if coll is weth it's and eth type coll
        if (address(IJoin(_joinAddr).gem()) == TokenUtils.WETH_ADDR) {
            return true;
        }

        return false;
    }

    /// @notice Returns the underlying token address from the joinAddr
    /// @dev For eth based collateral returns 0xEee... not weth addr
    /// @param _joinAddr Join address to check
    function getTokenFromJoin(address _joinAddr) internal view returns (address) {
        // if it's dai_join_addr don't check gem() it will fail, return dai addr
        if (_joinAddr == DAI_JOIN_ADDR) {
            return DAI_ADDR;
        }

        return address(IJoin(_joinAddr).gem());
    }

    function getUrnAndIlk(address _mcdManager, uint256 _vaultId) public view returns (address urn, bytes32 ilk) {
        if (_mcdManager == CROPPER) {
            urn = ICdpRegistry(CDP_REGISTRY).owns(_vaultId);
            ilk = ICdpRegistry(CDP_REGISTRY).ilks(_vaultId);
        } else {
            urn = IManager(_mcdManager).urns(_vaultId);
            ilk = IManager(_mcdManager).ilks(_vaultId);
        }
    }

    /// @notice Gets CDP info (collateral, debt)
    /// @param _manager Manager contract
    /// @param _cdpId Id of the CDP
    /// @param _ilk Ilk of the CDP
    function getCdpInfo(IManager _manager, uint _cdpId, bytes32 _ilk) public view returns (uint, uint) {
        address urn;

        if (address(_manager) == CROPPER) {
            urn = ICdpRegistry(CDP_REGISTRY).owns(_cdpId);
        } else {
            urn = _manager.urns(_cdpId);
        }

        (uint collateral, uint debt) = vat.urns(_ilk, urn);
        (,uint rate,,,) = vat.ilks(_ilk);

        return (collateral, rmul(debt, rate));
    }

    /// @notice Address that owns the DSProxy that owns the CDP
    /// @param _manager Manager contract
    /// @param _cdpId Id of the CDP
    function getOwner(IManager _manager, uint _cdpId) public view returns (address) {
        address owner;

        if (address(_manager) == CROPPER) {
            owner = ICdpRegistry(CDP_REGISTRY).owns(_cdpId);
        } else {
            owner = _manager.owns(_cdpId);
        }

        DSProxy proxy = DSProxy(uint160(owner));

        return proxy.owner();
    }
}
