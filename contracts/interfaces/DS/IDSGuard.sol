// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IDSGuard {
    function canCall(address src_, address dst_, bytes4 sig) external view returns (bool);
    function permit(bytes32 src, bytes32 dst, bytes32 sig) external;
    function forbid(bytes32 src, bytes32 dst, bytes32 sig) external;
    function permit(address src, address dst, bytes32 sig) external;
    function forbid(address src, address dst, bytes32 sig) external;
}
