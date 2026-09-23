// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IDFSRegistry {
    function getAddr(bytes4 _id) external view returns (address);

    function addNewContract(bytes4 _id, address _contractAddr, uint256 _waitPeriod) external;

    function startContractChange(bytes4 _id, address _newContractAddr) external;

    function approveContractChange(bytes4 _id) external;

    function cancelContractChange(bytes4 _id) external;
}
