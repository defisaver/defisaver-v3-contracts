// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

import "../DS/DSMath.sol";

import "../actions/mcd/helpers/McdHelper.sol";
import "../interfaces/mcd/IManager.sol";
import "../interfaces/mcd/ICropper.sol";
import "../interfaces/mcd/ISpotter.sol";
import "../interfaces/mcd/IVat.sol";
import "../interfaces/IDSProxy.sol";

/// @title Getter contract for Vault info from Maker protocol
contract McdView is DSMath, McdHelper {
    address public constant VAT_ADDRESS = 0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B;

    address public constant MCD_MANAGER = 0x5ef30b9986345249bc32d8928B7ee64DE9435E39;

    ISpotter public constant spotter = ISpotter(SPOTTER_ADDRESS);

    /// @notice Gets Vault info (collateral, debt)
    /// @param _managerAddr Address of the McdManger or Cropper contract
    /// @param _vaultId Id of the Vaults
    /// @param _ilk Ilk of the Vault
    function getVaultInfo(
        address _managerAddr,
        uint256 _vaultId,
        bytes32 _ilk
    ) public view returns (uint256, uint256) {
        address urn;
        if (_managerAddr == CROPPER) {
            address owner = ICdpRegistry(CDP_REGISTRY).owns(_vaultId);
            urn = ICropper(CROPPER).proxy(owner);
        } else {
            urn = IManager(_managerAddr).urns(_vaultId);
        }

        (uint256 collateral, uint256 debt) = vat.urns(_ilk, urn);
        (, uint256 rate, , , ) = vat.ilks(_ilk);

        return (collateral, rmul(debt, rate));
    }

    function getCdpInfo(uint _cdpId) external view
        returns (address urn, address owner, address userAddr, bytes32 ilk, uint collateral, uint debt) {

        IManager manager = IManager(MCD_MANAGER);
        owner = manager.owns(_cdpId);

        if (owner != CDP_REGISTRY) {
            ilk = manager.ilks(_cdpId);
            urn = manager.urns(_cdpId);
            owner = manager.owns(_cdpId);
        } else {
            owner = ICdpRegistry(CDP_REGISTRY).owns(_cdpId);
            urn = ICropper(CROPPER).proxy(owner);
            ilk = ICdpRegistry(CDP_REGISTRY).ilks(_cdpId);
        }

         try this._getProxyOwner(owner) returns (address user) {
                userAddr = user;
            } catch {}

        (collateral, debt) = vat.urns(ilk, urn);
    }

    function _getProxyOwner(address owner) external view returns (address userAddr) {
        IDSProxy proxy = IDSProxy(owner);
        userAddr = proxy.owner();
    }

    /// @notice Gets a price of the asset
    /// @param _ilk Ilk of the Vault
    function getPrice(bytes32 _ilk) public view returns (uint256) {
        (, uint256 mat) = spotter.ilks(_ilk);
        (, , uint256 spot, , ) = vat.ilks(_ilk);

        return rmul(rmul(spot, spotter.par()), mat);
    }

    /// @notice Gets Vaults ratio
    /// @param _vaultId Id of the Vault
    function getRatio(address _managerAddr, uint256 _vaultId) public view returns (uint256) {
        bytes32 ilk = IManager(_managerAddr).ilks(_vaultId);

        uint256 price = getPrice(ilk);

        (uint256 collateral, uint256 debt) = getVaultInfo(_managerAddr, _vaultId, ilk);

        if (debt == 0) return 0;

        return rdiv(wmul(collateral, price), debt) / (10**18);
    }

    function getCropJoinCdps(bytes32[] memory _ilks, address _user)
        public
        view
        returns (
            uint256[] memory ids,
            address[] memory urns,
            bytes32[] memory ilks
        )
    {
        uint256 count = _ilks.length;
        ids = new uint[](count);
        urns = new address[](count);
        ilks = new bytes32[](count);

        for (uint256 i = 0; i < count; ++i) {
            ids[i] = ICdpRegistry(CDP_REGISTRY).cdps(_ilks[i], _user);

            address owner = ICdpRegistry(CDP_REGISTRY).owns(ids[i]);
            urns[i] = ICropper(CROPPER).proxy(owner);

            ilks[i] = _ilks[i];
        }
    }
}
