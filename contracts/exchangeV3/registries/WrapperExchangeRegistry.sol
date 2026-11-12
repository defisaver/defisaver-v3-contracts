// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IWrapperExchangeRegistry } from "../../interfaces/exchange/IWrapperExchangeRegistry.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";

contract WrapperExchangeRegistry is AdminAuth, IWrapperExchangeRegistry {
    error EmptyAddrError();

    event WrapperAdded(address indexed wrapper);
    event WrapperRemoved(address indexed wrapper);

    mapping(address => bool) private wrappers;

    function addWrapper(address _wrapper) external onlyOwner {
        if (_wrapper == address(0)) {
            revert EmptyAddrError();
        }

        wrappers[_wrapper] = true;
        emit WrapperAdded(_wrapper);
    }

    function removeWrapper(address _wrapper) external onlyOwner {
        wrappers[_wrapper] = false;
        emit WrapperRemoved(_wrapper);
    }

    function isWrapper(address _wrapper) external view returns (bool) {
        return wrappers[_wrapper];
    }
}
