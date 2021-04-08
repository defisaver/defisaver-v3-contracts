// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;


abstract contract IOsm {
    mapping(address => uint256) public bud;

    function peep() external view virtual returns (bytes32, bool);
}
