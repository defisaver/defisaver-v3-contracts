// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IInstaAccount } from "./IInstaAccount.sol";

interface IInstaAccountV2 is IInstaAccount {
    function cast(
        string[] memory,
        bytes[] memory,
        address
    ) external payable returns (bytes32);

    function implementations() external view returns (address);
}