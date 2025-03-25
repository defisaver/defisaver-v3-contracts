// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVault } from "../../../../interfaces/fluid/vaults/IFluidVault.sol";
import { IFluidVaultT2 } from "../../../../interfaces/fluid/vaults/IFluidVaultT2.sol";
import { IFluidVaultT4 } from "../../../../interfaces/fluid/vaults/IFluidVaultT4.sol";
import { FluidDexModel } from "../../helpers/FluidDexModel.sol";
import { FluidVaultTypes } from "../../helpers/FluidVaultTypes.sol";
import { FluidDexTokensUtils } from "../../helpers/FluidDexTokensUtils.sol";
import { TokenUtils } from "../../../../utils/TokenUtils.sol";
import { DFSMath } from "../../../../utils/math/DFSMath.sol";

/// @title FluidWithdrawDexLogic - Implements the withdrawing of tokens from Fluid DEX
/// @dev Used only for vaults with smart collateral (T2 and T4)
library FluidWithdrawDexLogic {
    using TokenUtils for address;
    using DFSMath for uint256;
    using FluidVaultTypes for uint256;

    /// @notice Withdraws tokens from a Fluid DEX using variable amount of shares.
    /// @param _data Withdraw data
    /// @param _tokens Tokens data
    /// @return sharesBurnedOrTokenWithdrawn Supports two cases:
    ///         - For max withdrawal: Return the exact amount of full withdrawn tokens (either token0 or token1)
    ///         - For partial withdrawal: Return the amount of collateral shares burned.
    function withdrawVariable(
        FluidDexModel.WithdrawDexData memory _data,
        IFluidVault.Tokens memory _tokens
    ) internal returns (uint256 sharesBurnedOrTokenWithdrawn) {
        _data.vaultType.requireSmartCollateral();

        (bool sendColl0AsWrapped, bool sendColl1AsWrapped) = FluidDexTokensUtils.shouldSendTokensAsWrapped(
            _tokens,
            _data.wrapWithdrawnEth,
            _data.variableData.collAmount0,
            _data.variableData.collAmount1
        );

        address sendTokensTo = (sendColl0AsWrapped || sendColl1AsWrapped) ? address(this) : _data.to;

        // 1st CASE: Full withdrawal in coll token 0.
        if (_data.variableData.collAmount0 == type(uint256).max) {
            // type(int256).min will trigger max withdrawal inside the vault
            (, int256[] memory retVals) = _data.vaultType.isT2Vault()
                ? IFluidVaultT2(_data.vault).operatePerfect(
                    _data.nftId,
                    type(int256).min, /* perfectColShares_ */
                    -_data.minCollToWithdraw.signed256(),
                    0, /* colToken1MinMax_ */
                    0, /* newDebt_ */
                    sendTokensTo
                )
                : IFluidVaultT4(_data.vault).operatePerfect(
                    _data.nftId,
                    type(int256).min, /* perfectColShares_ */
                    -_data.minCollToWithdraw.signed256(),
                    0, /* colToken1MinMax_ */
                    0, /* perfectDebtShares_ */
                    0, /* debtToken0MinMax_ */
                    0, /* debtToken1MinMax_ */
                    sendTokensTo
                );

            uint256 token0Withdrawn = uint256(-retVals[1]);

            // If coll token0 should be wrapped, re-send it to the recipient
            FluidDexTokensUtils.sendTokens(
                _tokens,
                _data.to,
                token0Withdrawn,
                0, /* token1Withdrawn */
                sendColl0AsWrapped,
                false /* sendToken1AsWrapped */
            );

            return token0Withdrawn;
        }

        // 2nd CASE: Full withdrawal in coll token 1.
        if (_data.variableData.collAmount1 == type(uint256).max) {
            (, int256[] memory retVals) = _data.vaultType.isT2Vault()
                ? IFluidVaultT2(_data.vault).operatePerfect(
                    _data.nftId,
                    type(int256).min, /* perfectColShares_ */
                    0, /* colToken0MinMax_ */
                    -_data.minCollToWithdraw.signed256(),
                    0, /* newDebt_ */
                    sendTokensTo
                )
                : IFluidVaultT4(_data.vault).operatePerfect(
                    _data.nftId,
                    type(int256).min, /* perfectColShares_ */
                    0, /* colToken0MinMax_ */
                    -_data.minCollToWithdraw.signed256(),
                    0, /* perfectDebtShares_ */
                    0, /* debtToken0MinMax_ */
                    0, /* debtToken1MinMax_ */
                    sendTokensTo
                );

            uint256 token1Withdrawn = uint256(-retVals[2]);

            // If coll token1 should be wrapped, re-send it to the recipient
            FluidDexTokensUtils.sendTokens(
                _tokens,
                _data.to,
                0,
                token1Withdrawn,
                false,
                sendColl1AsWrapped
            );

            return token1Withdrawn;
        }

        // 3rd CASE: Handle partial withdrawal in either one or both collateral tokens.
        ( , int256 exactCollSharesBurned , ) = _data.vaultType.isT2Vault()
            ? IFluidVaultT2(_data.vault).operate(
                _data.nftId,
                -_data.variableData.collAmount0.signed256(),
                -_data.variableData.collAmount1.signed256(),
                -_data.variableData.maxCollShares.signed256(),
                0, /* newDebt_ */
                sendTokensTo
            )
            : IFluidVaultT4(_data.vault).operate(
                _data.nftId,
                -_data.variableData.collAmount0.signed256(),
                -_data.variableData.collAmount1.signed256(),
                -_data.variableData.maxCollShares.signed256(),
                0, /* newDebtToken0_ */
                0, /* newDebtToken1_ */
                0, /* debtSharesMinMax_ */
                sendTokensTo
            );

        sharesBurnedOrTokenWithdrawn = uint256(-exactCollSharesBurned);

        // If one of tokens should be wrapped, re-send them to the recipient
        FluidDexTokensUtils.sendTokens(
            _tokens,
            _data.to,
            _data.variableData.collAmount0,
            _data.variableData.collAmount1,
            sendColl0AsWrapped,
            sendColl1AsWrapped
        );
    }
}