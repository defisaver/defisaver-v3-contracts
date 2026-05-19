// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IWrapperExchangeRegistry {
    function isWrapper(address _wrapper) external view returns (bool);
    function addWrapper(address _wrapper) external;
    function removeWrapper(address _wrapper) external;
}
