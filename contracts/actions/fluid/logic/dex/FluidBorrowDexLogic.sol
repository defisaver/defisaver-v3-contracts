// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVault } from "../../../../interfaces/protocols/fluid/vaults/IFluidVault.sol";
import { IFluidVaultT3 } from "../../../../interfaces/protocols/fluid/vaults/IFluidVaultT3.sol";
import { IFluidVaultT4 } from "../../../../interfaces/protocols/fluid/vaults/IFluidVaultT4.sol";
import { FluidDexModel } from "../../helpers/FluidDexModel.sol";
import { FluidVaultTypes } from "../../helpers/FluidVaultTypes.sol";
import { FluidDexTokensUtils } from "../../helpers/FluidDexTokensUtils.sol";
import { TokenUtils } from "../../../../utils/TokenUtils.sol";
import { DFSLib } from "../../../../utils/DFSLib.sol";

/// @title FluidBorrowDexLogic - Implements the borrowing of tokens from Fluid DEX
/// @dev Used only for vaults with smart debt (T3 and T4)
library FluidBorrowDexLogic {
    using TokenUtils for address;
    using DFSLib for uint256;
    using FluidVaultTypes for uint256;

    /// @notice Borrows exact tokens from a Fluid DEX using variable amount of shares.
    /// @param _data Borrow data
    /// @param _tokens Tokens data
    /// @return borrowShares Amount of debt shares minted.
    function borrowVariable(FluidDexModel.BorrowDexData memory _data, IFluidVault.Tokens memory _tokens)
        internal
        returns (uint256 borrowShares)
    {
        _data.vaultType.requireSmartDebt();

        (bool sendDebt0AsWrapped, bool sendDebt1AsWrapped) = FluidDexTokensUtils.shouldSendTokensAsWrapped(
            _tokens, _data.wrapBorrowedEth, _data.variableData.debtAmount0, _data.variableData.debtAmount1
        );

        address sendTokensTo = (sendDebt0AsWrapped || sendDebt1AsWrapped) ? address(this) : _data.to;

        (,, int256 exactDebtShares) = _data.vaultType.isT3Vault()
            ? IFluidVaultT3(_data.vault)
                .operate(
                    _data.nftId,
                    0, /* newCol_ */
                    _data.variableData.debtAmount0.signed256(),
                    _data.variableData.debtAmount1.signed256(),
                    _data.variableData.maxDebtShares.signed256(),
                    sendTokensTo
                )
            : IFluidVaultT4(_data.vault)
                .operate(
                    _data.nftId,
                    0, /* newColToken0_ */
                    0, /* newColToken1_ */
                    0, /* colSharesMinMax_ */
                    _data.variableData.debtAmount0.signed256(),
                    _data.variableData.debtAmount1.signed256(),
                    _data.variableData.maxDebtShares.signed256(),
                    sendTokensTo
                );

        // If one of tokens should be wrapped, re-send them to the recipient
        FluidDexTokensUtils.sendTokens(
            _tokens,
            _data.to,
            _data.variableData.debtAmount0,
            _data.variableData.debtAmount1,
            sendDebt0AsWrapped,
            sendDebt1AsWrapped
        );

        borrowShares = uint256(exactDebtShares);
    }
}
