// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IDFSRegistry } from "../interfaces/core/IDFSRegistry.sol";

contract MockDFSRegistry is IDFSRegistry {

    mapping(bytes4 id => address addr) public addresses;

    function getAddr(bytes4 _id) external view override returns (address) {
        return addresses[_id];
    }

    function setAddr(bytes4 _id, address _addr) external {
        addresses[_id] = _addr;
    }
}