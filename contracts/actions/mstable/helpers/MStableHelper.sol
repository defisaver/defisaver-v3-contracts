// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;

import "./MainnetMStableAddresses.sol";
import "contracts/interfaces/mstable/ImAsset.sol";
import "contracts/interfaces/mstable/IBoostedVaultWithLockup.sol";
import "contracts/interfaces/mstable/ISavingsContractV2.sol";
import "contracts/utils/TokenUtils.sol";

contract MStableHelper is MainnetMStableAddresses {
    using TokenUtils for address;

    enum AssetPair {
        BASSET_MASSET,
        BASSET_IMASSET,
        BASSET_IMASSETVAULT,

        MASSET_IMASSET,
        MASSET_IMASSETVAULT,

        IMASSET_IMASSETVAULT
    }

    function _pull(address _asset, address _from, uint256 _amount) internal returns (uint256) {
        if (_amount == type(uint256).max) {
            _amount = _asset.getBalance(_from);
        }
        _asset.pullTokensIfNeeded(_from, _amount);
        return _amount;
    }

    function _vaultBalance(
        address _vaultAddress,
        address _user,
        uint256 _amount
    ) internal view returns (uint256) {
        if (_amount == type(uint256).max) {
            _amount = IBoostedVaultWithLockup(_vaultAddress).rawBalanceOf(_user);
        }

        return _amount;
    }

    function _mintMAsset(
        address _bAsset,
        address _mAsset,
        uint256 _amount,
        uint256 _minOut,
        address _to
    ) internal returns (
        uint256 mAssetsMinted
    ) {
        _bAsset.approveToken(_mAsset, _amount);
        mAssetsMinted = ImAsset(_mAsset).mint(
            _bAsset,
            _amount,
            _minOut,
            _to
        );
    }

    function _saveMAsset(
        address _mAsset,
        address _saveAddress,
        uint256 _amount,
        address _to
    ) internal returns (
        uint256 credits
    ) {
        _mAsset.approveToken(_saveAddress, _amount);
        credits = ISavingsContractV2(_saveAddress).depositSavings(_amount, _to);
    }

    function _stakeImAsset(
        address _saveAddress,
        address _vaultAddress,
        uint256 _amount,
        address _to
    ) internal returns (
        uint256 staked
    ) {
        _saveAddress.approveToken(_vaultAddress, _amount);
        IBoostedVaultWithLockup(_vaultAddress).stake(_to, _amount);
        return _amount;
    }

    function _unstakeImAsset(
        address _vaultAddress,
        uint256 _amount
    ) internal returns(
        uint256 unstaked
    ) {
        IBoostedVaultWithLockup(_vaultAddress).withdraw(_amount);
        return _amount;
    }

    function _withdrawSavedMAsset(
        address _saveAddress,
        uint256 _amount
    ) internal returns (
        uint256 withdrawn
    ) {
        withdrawn = ISavingsContractV2(_saveAddress).redeemCredits(_amount);
    }

    function _redeemMAsset(
        address _bAsset,
        address _mAsset,
        uint256 _amount,
        uint256 _minOut,
        address _to
    ) internal returns (
        uint256 redeemed
    ) {
        redeemed = ImAsset(_mAsset).redeem(_bAsset, _amount, _minOut, _to);
    }
}