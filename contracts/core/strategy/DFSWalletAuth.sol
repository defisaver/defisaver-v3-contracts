// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IDFSWallet } from "../../interfaces/dfsWallet/IDFSWallet.sol";
import { WalletAuth } from "./WalletAuth.sol";
import { DFSIds } from "../../utils/DFSIds.sol";

/// @title DFSWalletAuth - Automation adapter for DFSWallet
contract DFSWalletAuth is WalletAuth {
    /// @notice The requested target must be the current RecipeExecutor.
    error InvalidRecipeExecutor();

    /// @notice Executes a strategy recipe through an authorized DFSWallet.
    /// @param _wallet User wallet to execute through.
    /// @param _target Current RecipeExecutor address.
    /// @param _data Encoded recipe execution call.
    function callExecute(address _wallet, address _target, bytes memory _data)
        public
        payable
        onlyExecutor
        notPaused
    {
        if (_target != registry.getAddr(DFSIds.RECIPE_EXECUTOR)) {
            revert InvalidRecipeExecutor();
        }
        IDFSWallet(_wallet).execute{ value: msg.value }(DFSIds.RECIPE_EXECUTOR, _data);
    }
}
