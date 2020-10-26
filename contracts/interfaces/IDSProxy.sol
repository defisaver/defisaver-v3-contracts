// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

abstract contract IDSProxy {
    function execute(bytes memory _code, bytes memory _data)
        public virtual
        payable
        returns (address, bytes32);

    function execute(address _target, bytes memory _data) public virtual payable returns (bytes32);

    function setCache(address _cacheAddr) public virtual payable returns (bool);

    function owner() public virtual returns (address);
}
