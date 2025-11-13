// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

interface IAccountGuard {
    function owners(address) external view returns (address);

    function owner() external view returns (address);

    function setWhitelist(address target, bool status) external;

    function canCall(address proxy, address operator) external view returns (bool);

    function permit(address caller, address target, bool allowance) external;

    function isWhitelisted(address target) external view returns (bool);

    function isWhitelistedSend(address target) external view returns (bool);
}

