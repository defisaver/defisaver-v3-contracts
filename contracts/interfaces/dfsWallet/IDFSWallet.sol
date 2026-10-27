// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IDSAuthority } from "../DS/IDSAuthority.sol";
import { IDFSRegistry } from "../core/IDFSRegistry.sol";

interface IDFSWallet {
    function owner() external view returns (address);
    function authority() external view returns (IDSAuthority);
    function factory() external view returns (address);
    function dfsRegistry() external view returns (IDFSRegistry);
    function isAuthorized(address _src, bytes4 _sig) external view returns (bool);
    function setOwner(address _owner) external;
    function setAuthority(IDSAuthority _authority) external;
    function execute(bytes4 _targetId, bytes calldata _data) external payable returns (bytes memory);
}
