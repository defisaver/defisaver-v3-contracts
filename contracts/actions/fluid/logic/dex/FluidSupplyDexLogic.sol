// SPDX-License-Identifier: MIT

pragma solidity =0.8.27;

import { IFluidVault } from "../../../../interfaces/fluid/vaults/IFluidVault.sol";
import { IFluidVaultT2 } from "../../../../interfaces/fluid/vaults/IFluidVaultT2.sol";
import { IFluidVaultT4 } from "../../../../interfaces/fluid/vaults/IFluidVaultT4.sol";
import { FluidDexModel } from "../../helpers/FluidDexModel.sol";
import { FluidVaultTypes } from "../../helpers/FluidVaultTypes.sol";
import { FluidDexTokensUtils } from "../../helpers/FluidDexTokensUtils.sol";
import { TokenUtils } from "../../../../utils/TokenUtils.sol";
import { DFSMath } from "../../../../utils/math/DFSMath.sol";

/// @title FluidSupplyDexLogic - Implements the supplying of tokens to Fluid DEX
/// @dev Used only for vaults with smart collateral (T2 and T4)
library FluidSupplyDexLogic  {
    using TokenUtils for address;
    using DFSMath for uint256;
    using FluidVaultTypes for uint256;

    /// @notice Supplies tokens to a Fluid DEX using variable amount of shares.
    /// @param _data Supply data
    /// @param _tokens Tokens data
    /// @return nftId NFT ID of the position
    /// @return collShares Amount of collateral shares minted.
    function supplyVariable(
        FluidDexModel.SupplyDexData memory _data,
        IFluidVault.Tokens memory _tokens
    ) internal returns (uint256 nftId, uint256 collShares) {
        _data.vaultType.requireSmartCollateral();

        FluidDexTokensUtils.PulledTokensData memory vars = FluidDexTokensUtils.pullTokensIfNeededWithApproval(
            _tokens,
            _data.from,
            _data.vault,
            _data.variableData.collAmount0,
            _data.variableData.collAmount1
        );

        uint256 msgValue = vars.isToken0Native ? vars.amount0 : (vars.isToken1Native ? vars.amount1 : 0);

        int256 exactCollSharesMinted;

        (nftId, exactCollSharesMinted, ) = _data.vaultType.isT2Vault()
            ? IFluidVaultT2(_data.vault).operate{ value: msgValue }(
                _data.nftId,
                vars.amount0.signed256(),
                vars.amount1.signed256(),
                _data.variableData.minCollShares.signed256(),
                0, /* debtAmount */
                address(0) /* to */
            )
            : IFluidVaultT4(_data.vault).operate{ value: msgValue }(
                _data.nftId,
                vars.amount0.signed256(),
                vars.amount1.signed256(),
                _data.variableData.minCollShares.signed256(),
                0, /* debtAmount0 */
                0, /* debtAmount1 */
                0, /* minDebtShares */
                address(0) /* to */
            );

        collShares = uint256(exactCollSharesMinted);
    }
}