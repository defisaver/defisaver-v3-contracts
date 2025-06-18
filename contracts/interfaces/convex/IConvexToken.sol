// SPDX-License-Identifier: MIT
pragma solidity =0.8.27;

import { IERC20 } from "../../interfaces/IERC20.sol";

interface IConvexToken is IERC20 {
    function reductionPerCliff() external view returns (uint256);
    function totalCliffs() external view returns (uint256);
    function maxSupply() external view returns (uint256);
}