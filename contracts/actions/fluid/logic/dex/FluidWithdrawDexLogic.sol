// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVault } from "../../../../interfaces/protocols/fluid/vaults/IFluidVault.sol";
import { IFluidVaultT2 } from "../../../../interfaces/protocols/fluid/vaults/IFluidVaultT2.sol";
import { IFluidVaultT4 } from "../../../../interfaces/protocols/fluid/vaults/IFluidVaultT4.sol";
import { FluidDexModel } from "../../helpers/FluidDexModel.sol";
import { FluidVaultTypes } from "../../helpers/FluidVaultTypes.sol";
import { FluidDexTokensUtils } from "../../helpers/FluidDexTokensUtils.sol";
import { TokenUtils } from "../../../../utils/token/TokenUtils.sol";
import { DFSLib } from "../../../../utils/DFSLib.sol";

/// @title FluidWithdrawDexLogic - Implements the withdrawing of tokens from Fluid DEX
/// @dev Used only for vaults with smart collateral (T2 and T4)
library FluidWithdrawDexLogic {
    using TokenUtils for address;
    using DFSLib for uint256;
    using FluidVaultTypes for uint256;

    /// @notice Withdraws tokens from a Fluid DEX using variable amount of shares.
    /// @param _data Withdraw data
    /// @param _tokens Tokens data
    /// @return sharesBurnedOrTokenWithdrawn Supports two cases:
    ///         - For partial withdrawal: Return the amount of collateral shares burned.
    ///         - For max withdrawal: Return the exact amount of full withdrawn tokens (either token0 or token1)
    function withdrawVariable(FluidDexModel.WithdrawDexData memory _data, IFluidVault.Tokens memory _tokens)
        internal
        returns (uint256 sharesBurnedOrTokenWithdrawn)
    {
        _data.vaultType.requireSmartCollateral();

        (bool sendColl0AsWrapped, bool sendColl1AsWrapped) = FluidDexTokensUtils.shouldSendTokensAsWrapped(
            _tokens, _data.wrapWithdrawnEth, _data.variableData.collAmount0, _data.variableData.collAmount1
        );

        address sendTokensTo = (sendColl0AsWrapped || sendColl1AsWrapped) ? address(this) : _data.to;

        // 1st CASE: Full withdrawal in coll token 0.
        if (_data.variableData.collAmount0 == type(uint256).max) {
            return _maxWithdrawalInToken0(_data, _tokens, sendTokensTo, sendColl0AsWrapped);
        }

        // 2nd CASE: Full withdrawal in coll token 1.
        if (_data.variableData.collAmount1 == type(uint256).max) {
            return _maxWithdrawalInToken1(_data, _tokens, sendTokensTo, sendColl1AsWrapped);
        }

        // 3rd CASE: Handle partial withdrawal in either one or both collateral tokens.
        return _partialWithdrawal(_data, _tokens, sendTokensTo, sendColl0AsWrapped, sendColl1AsWrapped);
    }

    /// @notice Helper function to handle max withdrawal in coll token 0.
    /// @return exactToken0Withdrawn The full amount of collateral withdrawn represented in token 0.
    function _maxWithdrawalInToken0(
        FluidDexModel.WithdrawDexData memory _data,
        IFluidVault.Tokens memory _tokens,
        address _sendTokensTo,
        bool _sendColl0AsWrapped
    ) internal returns (uint256 exactToken0Withdrawn) {
        // type(int256).min will trigger max withdrawal inside the vault
        (, int256[] memory retVals) = _data.vaultType.isT2Vault()
            ? IFluidVaultT2(_data.vault)
                .operatePerfect(
                    _data.nftId,
                    type(int256).min, /* perfectColShares_ */
                    -_data.variableData.minCollToWithdraw.signed256(),
                    0, /* colToken1MinMax_ */
                    0, /* newDebt_ */
                    _sendTokensTo
                )
            : IFluidVaultT4(_data.vault)
                .operatePerfect(
                    _data.nftId,
                    type(int256).min, /* perfectColShares_ */
                    -_data.variableData.minCollToWithdraw.signed256(),
                    0, /* colToken1MinMax_ */
                    0, /* perfectDebtShares_ */
                    0, /* debtToken0MinMax_ */
                    0, /* debtToken1MinMax_ */
                    _sendTokensTo
                );

        // See IFluidVaultT2:operatePerfect and IFluidVaultT4:operatePerfect for return values indexing.
        exactToken0Withdrawn = uint256(-retVals[1]);

        // If coll token0 should be wrapped, re-send it to the recipient
        FluidDexTokensUtils.sendTokens(
            _tokens,
            _data.to,
            exactToken0Withdrawn,
            0, /* token1Withdrawn */
            _sendColl0AsWrapped,
            false /* sendToken1AsWrapped */
        );
    }

    /// @notice Helper function to handle max withdrawal in coll token 1.
    /// @return exactToken1Withdrawn The full amount of collateral withdrawn represented in token 1.
    function _maxWithdrawalInToken1(
        FluidDexModel.WithdrawDexData memory _data,
        IFluidVault.Tokens memory _tokens,
        address _sendTokensTo,
        bool _sendColl1AsWrapped
    ) internal returns (uint256 exactToken1Withdrawn) {
        // type(int256).min will trigger max withdrawal inside the vault
        (, int256[] memory retVals) = _data.vaultType.isT2Vault()
            ? IFluidVaultT2(_data.vault)
                .operatePerfect(
                    _data.nftId,
                    type(int256).min, /* perfectColShares_ */
                    0, /* colToken0MinMax_ */
                    -_data.variableData.minCollToWithdraw.signed256(),
                    0, /* newDebt_ */
                    _sendTokensTo
                )
            : IFluidVaultT4(_data.vault)
                .operatePerfect(
                    _data.nftId,
                    type(int256).min, /* perfectColShares_ */
                    0, /* colToken0MinMax_ */
                    -_data.variableData.minCollToWithdraw.signed256(),
                    0, /* perfectDebtShares_ */
                    0, /* debtToken0MinMax_ */
                    0, /* debtToken1MinMax_ */
                    _sendTokensTo
                );

        // See IFluidVaultT2:operatePerfect and IFluidVaultT4:operatePerfect for return values indexing.
        exactToken1Withdrawn = uint256(-retVals[2]);

        // If coll token1 should be wrapped, re-send it to the recipient
        FluidDexTokensUtils.sendTokens(
            _tokens,
            _data.to,
            0, /* token0Withdrawn */
            exactToken1Withdrawn,
            false, /* _sendToken0AsWrapped */
            _sendColl1AsWrapped
        );
    }

    /// @notice Helper function to handle partial withdrawal in either one or both collateral tokens.
    /// @return sharesBurnedOrTokenWithdrawn The amount of collateral shares burned.
    function _partialWithdrawal(
        FluidDexModel.WithdrawDexData memory _data,
        IFluidVault.Tokens memory _tokens,
        address _sendTokensTo,
        bool _sendColl0AsWrapped,
        bool _sendColl1AsWrapped
    ) internal returns (uint256 sharesBurnedOrTokenWithdrawn) {
        (, int256 exactCollSharesBurned,) = _data.vaultType.isT2Vault()
            ? IFluidVaultT2(_data.vault)
                .operate(
                    _data.nftId,
                    -_data.variableData.collAmount0.signed256(),
                    -_data.variableData.collAmount1.signed256(),
                    -_data.variableData.maxCollShares.signed256(),
                    0, /* newDebt_ */
                    _sendTokensTo
                )
            : IFluidVaultT4(_data.vault)
                .operate(
                    _data.nftId,
                    -_data.variableData.collAmount0.signed256(),
                    -_data.variableData.collAmount1.signed256(),
                    -_data.variableData.maxCollShares.signed256(),
                    0, /* newDebtToken0_ */
                    0, /* newDebtToken1_ */
                    0, /* debtSharesMinMax_ */
                    _sendTokensTo
                );

        sharesBurnedOrTokenWithdrawn = uint256(-exactCollSharesBurned);

        // If one of tokens should be wrapped, re-send them to the recipient
        FluidDexTokensUtils.sendTokens(
            _tokens,
            _data.to,
            _data.variableData.collAmount0,
            _data.variableData.collAmount1,
            _sendColl0AsWrapped,
            _sendColl1AsWrapped
        );
    }
}
