// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;
abstract contract IBytesTransientStorage {
    function setBytesTransiently(bytes calldata) public virtual;
    function getBytesTransiently() public virtual returns (bytes memory);
}
