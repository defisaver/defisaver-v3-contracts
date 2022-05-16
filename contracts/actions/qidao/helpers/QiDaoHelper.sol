// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "./../../../interfaces/qidao/IQiDaoRegistry.sol";
import "./OptimismQiDaoAddresses.sol";

contract QiDaoHelper is OptimismQiDaoAddresses {
    error NullAddressTransfer();
    IQiDaoRegistry constant public vaultRegistry = IQiDaoRegistry(QI_DAO_VAULT_REGISTRY);
}