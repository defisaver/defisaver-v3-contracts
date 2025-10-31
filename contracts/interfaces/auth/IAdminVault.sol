// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IAdminVault {
    function owner() external view returns (address);
    function admin() external view returns (address);
    function changeOwner(address _owner) external;
    function changeAdmin(address _admin) external;
}
