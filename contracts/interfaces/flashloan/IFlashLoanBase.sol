// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IFlashLoanBase {
    struct FlashLoanParams {
        address[] tokens;
        uint256[] amounts;
        uint256[] modes;
        address onBehalfOf;
        address flParamGetterAddr;
        bytes flParamGetterData;
        bytes recipeData;
    }
}
