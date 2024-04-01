// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import {ActionsUtils} from "../../../test-sol/utils/ActionsUtils.sol";

/// @dev To bypass hardhat lookup in source directory, as ActionsUtils is in test-sol (foundry) directory
/// @dev Used for checking if encoding in foundry tests match with sdk encoding
contract FoundryHelper is ActionsUtils{}
