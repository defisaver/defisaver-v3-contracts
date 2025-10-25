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

/// @title FluidPaybackDexLogic - Implements the payback of tokens to Fluid DEX
/// @dev Used only for vaults with smart debt (T3 and T4)
library FluidPaybackDexLogic {
    using TokenUtils for address;
    using DFSLib for uint256;
    using FluidVaultTypes for uint256;

    /// @notice Pays back tokens to a Fluid DEX using variable amount of shares.
    /// @param _data Payback data
    /// @param _tokens Tokens data
    /// @return burnedSharesOrFullDebtAmount Supports two cases:
    ///         - For partial payback: Return the amount of debt shares burned.
    ///         - For max payback: Return the exact amount of full payback tokens (either token0 or token1)
    function paybackVariable(FluidDexModel.PaybackDexData memory _data, IFluidVault.Tokens memory _tokens)
        internal
        returns (uint256 burnedSharesOrFullDebtAmount)
    {
        _data.vaultType.requireSmartDebt();

        // 1st CASE: Max payback in debt token 0.
        if (_data.variableData.debtAmount0 == type(uint256).max) {
            return _maxPaybackInToken0(_data, _tokens);
        }

        // 2nd CASE: Max payback in debt token 1.
        if (_data.variableData.debtAmount1 == type(uint256).max) {
            return _maxPaybackInToken1(_data, _tokens);
        }

        // 3rd CASE: Handle partial payback in either one or both debt tokens.
        return _partialPayback(_data, _tokens);
    }

    /// @notice Helper function to handle max payback in debt token 0.
    /// @return exactDebtToken0Pulled The full amount of debt represented in token 0.
    function _maxPaybackInToken0(FluidDexModel.PaybackDexData memory _data, IFluidVault.Tokens memory _tokens)
        internal
        returns (uint256 exactDebtToken0Pulled)
    {
        // We always pull maximum amount of token 0 that user allowed and refund any dust amount later
        FluidDexTokensUtils.PulledTokensData memory vars = FluidDexTokensUtils.pullTokensIfNeededWithApproval(
            _tokens,
            _data.from,
            _data.vault,
            _data.variableData.maxAmountToPull,
            0 /* amount1 */
        );

        uint256 msgValue = vars.isToken0Native ? vars.amount0 : 0;

        bool isT3Vault = _data.vaultType.isT3Vault();

        // type(int256).min will trigger max payback inside the vault
        (, int256[] memory retVals) = isT3Vault
            ? IFluidVaultT3(_data.vault).operatePerfect{ value: msgValue }(
                _data.nftId,
                0, /* newCol_ */
                type(int256).min, /* perfectDebtShares_ */
                -vars.amount0.signed256(),
                0, /* debtToken1MinMax_ */
                address(0) /* to */
            )
            : IFluidVaultT4(_data.vault).operatePerfect{ value: msgValue }(
                _data.nftId,
                0, /* perfectColShares_ */
                0, /* colToken0MinMax_ */
                0, /* colToken1MinMax_ */
                type(int256).min, /* perfectDebtShares_ */
                -vars.amount0.signed256(),
                0, /* debtToken1MinMax_ */
                address(0) /* to */
            );

        // See IFluidVaultT3.operatePerfect and IFluidVaultT4.operatePerfect for return values indexing.
        exactDebtToken0Pulled = uint256(-retVals[isT3Vault ? 2 : 4]);

        // Refund any dust amount in debt token 0
        if (vars.amount0 > exactDebtToken0Pulled) {
            uint256 refund = vars.amount0 - exactDebtToken0Pulled;
            // Refund ETH as WETH
            if (vars.isToken0Native) {
                TokenUtils.depositWeth(refund);
                TokenUtils.WETH_ADDR.withdrawTokens(_data.from, refund);
            } else {
                _tokens.token0.withdrawTokens(_data.from, refund);
                // Remove any dust approval.
                _tokens.token0.approveToken(_data.vault, 0);
            }
        }
    }

    /// @notice Helper function to handle max payback in debt token 1.
    /// @return exactDebtToken1Pulled The full amount of debt represented in token 1.
    function _maxPaybackInToken1(FluidDexModel.PaybackDexData memory _data, IFluidVault.Tokens memory _tokens)
        internal
        returns (uint256 exactDebtToken1Pulled)
    {
        // We always pull maximum amount of token 1 that user allowed and refund any dust amount later
        FluidDexTokensUtils.PulledTokensData memory vars = FluidDexTokensUtils.pullTokensIfNeededWithApproval(
            _tokens,
            _data.from,
            _data.vault,
            0,
            /* amount0 */
            _data.variableData.maxAmountToPull
        );

        uint256 msgValue = vars.isToken1Native ? vars.amount1 : 0;

        bool isT3Vault = _data.vaultType.isT3Vault();

        // type(int256).min will trigger max payback inside the vault
        (, int256[] memory retVals) = isT3Vault
            ? IFluidVaultT3(_data.vault).operatePerfect{ value: msgValue }(
                _data.nftId,
                0, /* newCol_ */
                type(int256).min, /* perfectDebtShares_ */
                0, /* debtToken0MinMax_ */
                -vars.amount1.signed256(),
                address(0) /* to */
            )
            : IFluidVaultT4(_data.vault).operatePerfect{ value: msgValue }(
                _data.nftId,
                0, /* perfectColShares_ */
                0, /* colToken0MinMax_ */
                0, /* colToken1MinMax_ */
                type(int256).min, /* perfectDebtShares_ */
                0, /* debtToken0MinMax_ */
                -vars.amount1.signed256(),
                address(0) /* to */
            );

        // See IFluidVaultT3.operatePerfect and IFluidVaultT4.operatePerfect for return values indexing.
        exactDebtToken1Pulled = uint256(-retVals[isT3Vault ? 3 : 5]);

        // Refund any dust amount in debt token 1
        if (vars.amount1 > exactDebtToken1Pulled) {
            uint256 refund = vars.amount1 - exactDebtToken1Pulled;
            // Refund ETH as WETH
            if (vars.isToken1Native) {
                TokenUtils.depositWeth(refund);
                TokenUtils.WETH_ADDR.withdrawTokens(_data.from, refund);
            } else {
                _tokens.token1.withdrawTokens(_data.from, refund);
                // Remove any dust approval.
                _tokens.token1.approveToken(_data.vault, 0);
            }
        }
    }

    /// @notice Helper function to handle partial payback in either one or both debt tokens.
    /// @return burnedDebtShares The amount of debt shares burned.
    function _partialPayback(FluidDexModel.PaybackDexData memory _data, IFluidVault.Tokens memory _tokens)
        internal
        returns (uint256 burnedDebtShares)
    {
        FluidDexTokensUtils.PulledTokensData memory vars = FluidDexTokensUtils.pullTokensIfNeededWithApproval(
            _tokens, _data.from, _data.vault, _data.variableData.debtAmount0, _data.variableData.debtAmount1
        );

        uint256 msgValue = vars.isToken0Native ? vars.amount0 : (vars.isToken1Native ? vars.amount1 : 0);

        (,, int256 exactBorrowSharesBurned) = _data.vaultType.isT3Vault()
            ? IFluidVaultT3(_data.vault).operate{ value: msgValue }(
                _data.nftId,
                0, /* newCol_ */
                -vars.amount0.signed256(),
                -vars.amount1.signed256(),
                -_data.variableData.minDebtShares.signed256(),
                address(0) /* to */
            )
            : IFluidVaultT4(_data.vault).operate{ value: msgValue }(
                _data.nftId,
                0, /* newColToken0_ */
                0, /* newColToken1_ */
                0, /* colSharesMinMax_ */
                -vars.amount0.signed256(),
                -vars.amount1.signed256(),
                -_data.variableData.minDebtShares.signed256(),
                address(0) /* to_ */
            );

        burnedDebtShares = uint256(-exactBorrowSharesBurned);
    }
}
