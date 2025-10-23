// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IInstaIndex {

    event LogAccountCreated(address sender, address indexed owner, address indexed account, address indexed origin);

    function build(
        address _owner,
        uint accountVersion,
        address _origin
    ) external returns (address _account);

    function master() external view returns (address);
}