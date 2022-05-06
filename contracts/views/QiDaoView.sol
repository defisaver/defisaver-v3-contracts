// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../actions/qidao/helpers/QiDaoHelper.sol";
import "../interfaces/qidao/IStablecoin.sol";

contract QiDaoView is QiDaoHelper {

    function getVaultInfo(uint16 _vaultId, uint256 _userVaultId) public view returns (uint256 coll, uint256 debt) {
        address vaultAddress = vaultRegistry.vaultAddressById(_vaultId);
        coll = IStablecoin(vaultAddress).vaultCollateral(_userVaultId);
        debt = IStablecoin(vaultAddress).vaultDebt(_userVaultId);

    }
}