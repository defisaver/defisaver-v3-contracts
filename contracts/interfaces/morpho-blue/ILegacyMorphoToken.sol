// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

/// @dev This interface is only used inside tests
interface ILegacyMorphoToken {
    function setUserRole(
        address user,
        uint8 role,
        bool enabled
    ) external;

    function setRoleCapability(
        uint8 role,
        bytes4 functionSig,
        bool enabled
    ) external;

    function owner() external view returns (address);
}