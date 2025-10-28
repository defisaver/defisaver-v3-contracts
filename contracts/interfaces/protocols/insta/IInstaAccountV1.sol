// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IInstaAccount } from "./IInstaAccount.sol";

interface IInstaAccountV1 is IInstaAccount {
    function cast(address[] memory, bytes[] memory, address) external payable;
}
