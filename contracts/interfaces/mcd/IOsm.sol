// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;


abstract contract IOsm {
    mapping(address => uint256) public bud;

    function peep() external view virtual returns (bytes32, bool);
}
