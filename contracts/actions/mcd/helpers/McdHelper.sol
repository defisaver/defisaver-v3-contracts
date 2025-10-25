// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { DSMath } from "../../../_vendor/DS/DSMath.sol";
import { IManager } from "../../../interfaces/protocols/mcd/IManager.sol";
import { IJoin } from "../../../interfaces/protocols/mcd/IJoin.sol";
import { IVat } from "../../../interfaces/protocols/mcd/IVat.sol";
import { ICropper } from "../../../interfaces/protocols/mcd/ICropper.sol";
import { TokenUtils } from "../../../utils/token/TokenUtils.sol";
import { ICdpRegistry } from "../../../interfaces/protocols/mcd/ICdpRegistry.sol";
import { MainnetMcdAddresses } from "./MainnetMcdAddresses.sol";

/// @title Helper methods for MCDSaverProxy
contract McdHelper is DSMath, MainnetMcdAddresses {
    IVat public constant vat = IVat(VAT_ADDR);

    error IntOverflow();

    /// @notice Returns a normalized debt _amount based on the current rate
    /// @param _amount Amount of dai to be normalized
    /// @param _rate Current rate of the stability fee
    /// @param _daiVatBalance Balance od Dai in the Vat for that CDP
    function normalizeDrawAmount(uint256 _amount, uint256 _rate, uint256 _daiVatBalance)
        internal
        pure
        returns (int256 dart)
    {
        if (_daiVatBalance < _amount * RAY) {
            dart = toPositiveInt((_amount * RAY - _daiVatBalance) / _rate);
            dart = uint256(dart) * _rate < _amount * RAY ? dart + 1 : dart;
        }
    }

    /// @notice Converts a number to Rad precision
    /// @param _wad The input number in wad precision
    function toRad(uint256 _wad) internal pure returns (uint256) {
        return _wad * (10 ** 27);
    }

    /// @notice Converts a number to 18 decimal precision
    /// @dev If token decimal is bigger than 18, function reverts
    /// @param _joinAddr Join address of the collateral
    /// @param _amount Number to be converted
    function convertTo18(address _joinAddr, uint256 _amount) internal view returns (uint256) {
        return _amount * (10 ** (18 - IJoin(_joinAddr).dec()));
    }

    /// @notice Converts a uint to int and checks if positive
    /// @param _x Number to be converted
    function toPositiveInt(uint256 _x) internal pure returns (int256 y) {
        y = int256(_x);
        if (y < 0) {
            revert IntOverflow();
        }
    }

    /// @notice Gets Dai amount in Vat which can be added to Cdp
    /// @param _vat Address of Vat contract
    /// @param _daiBalance Amount of dai in vat contract for that urn
    /// @param _urn Urn of the Cdp
    /// @param _ilk Ilk of the Cdp
    function normalizePaybackAmount(address _vat, uint256 _daiBalance, address _urn, bytes32 _ilk)
        internal
        view
        returns (int256 amount)
    {
        (, uint256 rate,,,) = IVat(_vat).ilks(_ilk);
        (, uint256 art) = IVat(_vat).urns(_ilk, _urn);

        amount = toPositiveInt(_daiBalance / rate);
        amount = uint256(amount) <= art ? -amount : -toPositiveInt(art);
    }

    /// @notice Gets the whole debt of the CDP
    /// @param _vat Address of Vat contract
    /// @param _usr Address of the Dai holder
    /// @param _urn Urn of the Cdp
    /// @param _ilk Ilk of the Cdp
    function getAllDebt(address _vat, address _usr, address _urn, bytes32 _ilk)
        internal
        view
        returns (uint256 daiAmount)
    {
        (, uint256 rate,,,) = IVat(_vat).ilks(_ilk);
        (, uint256 art) = IVat(_vat).urns(_ilk, _urn);
        uint256 dai = IVat(_vat).dai(_usr);

        uint256 rad = art * rate - dai;
        daiAmount = rad / RAY;

        // handles precision error (off by 1 wei)
        daiAmount = daiAmount * RAY < rad ? daiAmount + 1 : daiAmount;
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
            return DAI_ADDRESS;
        }

        return address(IJoin(_joinAddr).gem());
    }

    function getUrnAndIlk(address _mcdManager, uint256 _vaultId) public view returns (address urn, bytes32 ilk) {
        if (_mcdManager == CROPPER) {
            address owner = ICdpRegistry(CDP_REGISTRY).owns(_vaultId);
            urn = ICropper(CROPPER).proxy(owner);
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
    function getCdpInfo(IManager _manager, uint256 _cdpId, bytes32 _ilk) public view returns (uint256, uint256) {
        address urn;

        if (address(_manager) == CROPPER) {
            address owner = ICdpRegistry(CDP_REGISTRY).owns(_cdpId);
            urn = ICropper(CROPPER).proxy(owner);
        } else {
            urn = _manager.urns(_cdpId);
        }

        (uint256 collateral, uint256 debt) = vat.urns(_ilk, urn);
        (, uint256 rate,,,) = vat.ilks(_ilk);

        return (collateral, rmul(debt, rate));
    }

    /// @notice Returns all the collateral of the vault, formatted in the correct decimal
    /// @dev Will fail if token is over 18 decimals
    function getAllColl(IManager _mcdManager, address _joinAddr, uint256 _vaultId)
        internal
        view
        returns (uint256 amount)
    {
        bytes32 ilk;

        if (address(_mcdManager) == CROPPER) {
            ilk = ICdpRegistry(CDP_REGISTRY).ilks(_vaultId);
        } else {
            ilk = _mcdManager.ilks(_vaultId);
        }

        (amount,) = getCdpInfo(_mcdManager, _vaultId, ilk);

        if (IJoin(_joinAddr).dec() != 18) {
            return div(amount, 10 ** sub(18, IJoin(_joinAddr).dec()));
        }
    }
}
