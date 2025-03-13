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
    /// @return collSharesBurned Amount of collateral shares burned.
    function withdrawVariable(
        FluidDexModel.WithdrawDexData memory _data,
        IFluidVault.Tokens memory _tokens
    ) internal returns (uint256 collSharesBurned) {
        _data.vaultType.requireSmartCollateral();

        (bool sendColl0AsWrapped, bool sendColl1AsWrapped) = FluidDexTokensUtils.shouldSendTokensAsWrapped(
            _tokens,
            _data.wrapWithdrawnEth,
            _data.variableData.collAmount0,
            _data.variableData.collAmount1
        );

        address sendTokensTo = (sendColl0AsWrapped || sendColl1AsWrapped) ? address(this) : _data.to;

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

        collSharesBurned = uint256(-exactCollSharesBurned);

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