// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

interface IAuth {

    ///@param _walletAddr Address of the user's wallet
    ///@param _recipeExecutorAddr Address of the recipe executor
    ///@param _callData Data to be executed by the recipe executor
    function callExecute(
        address _walletAddr,
        address _recipeExecutorAddr,
        bytes memory _callData
    ) external payable;
}
