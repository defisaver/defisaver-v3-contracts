// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;
pragma abicoder v2;


interface IInstaAccountV2 {
    function cast(
        string[] memory,
        bytes[] memory,
        address
    ) external payable returns (bytes32);

    function implementations() external view returns (address);

    function isAuth(address _user) external view returns (bool);
    function enable(address _user) external;
    function disable(address _user) external;
}