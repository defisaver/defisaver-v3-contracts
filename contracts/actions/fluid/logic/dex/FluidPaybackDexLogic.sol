// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVault } from "../../../../interfaces/fluid/vaults/IFluidVault.sol";
import { IFluidVaultT3 } from "../../../../interfaces/fluid/vaults/IFluidVaultT3.sol";
import { IFluidVaultT4 } from "../../../../interfaces/fluid/vaults/IFluidVaultT4.sol";
import { FluidDexModel } from "../../helpers/FluidDexModel.sol";
import { FluidVaultTypes } from "../../helpers/FluidVaultTypes.sol";
import { FluidDexTokensUtils } from "../../helpers/FluidDexTokensUtils.sol";
import { TokenUtils } from "../../../../utils/TokenUtils.sol";
import { DFSMath } from "../../../../utils/math/DFSMath.sol";

/// @title FluidPaybackDexLogic - Implements the payback of tokens to Fluid DEX
/// @dev Used only for vaults with smart debt (T3 and T4)
library FluidPaybackDexLogic {
    using TokenUtils for address;
    using DFSMath for uint256;
    using FluidVaultTypes for uint256;

    /// @notice Pays back tokens to a Fluid DEX using variable amount of shares.
    /// @param _data Payback data
    /// @param _tokens Tokens data
    /// @return burnedShares Amount of debt shares burned.
    function paybackVariable(
        FluidDexModel.PaybackDexData memory _data,
        IFluidVault.Tokens memory _tokens
    ) internal returns (uint256 burnedShares) {
        _data.vaultType.requireSmartDebt();

        FluidDexTokensUtils.PulledTokensData memory vars = FluidDexTokensUtils.pullTokensIfNeededWithApproval(
            _tokens,
            _data.from,
            _data.vault,
            _data.variableData.debtAmount0,
            _data.variableData.debtAmount1
        );

        uint256 msgValue = vars.isToken0Native
            ? vars.amount0
            : (vars.isToken1Native ? vars.amount1 : 0);

        ( , , int256 exactBorrowSharesBurned) = _data.vaultType.isT3Vault()
            ? IFluidVaultT3(_data.vault).operate{ value: msgValue }(
                _data.nftId,
                0, /* newCol_ */
                -vars.amount0.signed256(),
                -vars.amount1.signed256(),
                -_data.variableData.maxDebtShares.signed256(),
                address(0) /* to */
            )
            : IFluidVaultT4(_data.vault).operate(
                _data.nftId,
                0, /* newColToken0_ */
                0, /* newColToken1_ */
                0, /* colSharesMinMax_ */
                -vars.amount0.signed256(),
                -vars.amount1.signed256(),
                -_data.variableData.maxDebtShares.signed256(),
                address(0) /* to_ */
            );

        burnedShares = uint256(-exactBorrowSharesBurned);
    }
}