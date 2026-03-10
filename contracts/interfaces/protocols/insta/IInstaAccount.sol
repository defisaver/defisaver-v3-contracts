// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

/// @title Generic interface for DSA Proxy Accounts. Used for both V1 and V2 versions.
interface IInstaAccount {
    function isAuth(address _user) external view returns (bool);
    function enable(address _user) external;
    function disable(address _user) external;
    function version() external view returns (uint256);
}
