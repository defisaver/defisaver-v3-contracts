// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVault } from "../../../../interfaces/fluid/IFluidVault.sol";
import { IFluidVaultT2 } from "../../../../interfaces/fluid/IFluidVaultT2.sol";
import { IFluidVaultT4 } from "../../../../interfaces/fluid/IFluidVaultT4.sol";

import { FluidDexModel } from "../../helpers/FluidDexModel.sol";
import { FluidVaultTypes } from "../../helpers/FluidVaultTypes.sol";

import { TokenUtils } from "../../../../utils/TokenUtils.sol";
import { DFSMath } from "../../../../utils/math/DFSMath.sol";

library FluidSupplyDexLogic  {
    using TokenUtils for address;
    using DFSMath for uint256;
    using FluidVaultTypes for uint256;

    // Helper struct to store local variables
    struct PulledCollateralVars {
        uint256 collAmount0;
        uint256 collAmount1;
        bool isColl0Native;
        bool isColl1Native;
    }

    function supplyVariable(
        FluidDexModel.SupplyDexData memory _data,
        IFluidVault.Tokens memory _tokens
    ) internal returns (uint256 nftId, uint256 collShares) {
        _data.vaultType.requireT2orT4Vault();

        PulledCollateralVars memory vars;

        (vars.collAmount0, vars.isColl0Native) = _pullTokensIfNeededWithApproval(
            _data.variableData.collAmount0,
            _tokens.token0,
            _data.from,
            _data.vault
        );

        (vars.collAmount1, vars.isColl1Native) = _pullTokensIfNeededWithApproval(
            _data.variableData.collAmount1,
            _tokens.token1,
            _data.from,
            _data.vault
        );

        uint256 msgValue = vars.isColl0Native
            ? vars.collAmount0
            : (vars.isColl1Native ? vars.collAmount1 : 0);

        int256 exactCollSharesMinted;

        if (_data.vaultType.isT2Vault()) {
            (nftId, exactCollSharesMinted, ) = IFluidVaultT2(_data.vault).operate{ value: msgValue }(
                _data.nftId,
                vars.collAmount0.signed256(),
                vars.collAmount1.signed256(),
                _data.variableData.minCollShares.signed256(),
                0, /* debtAmount */
                address(0) /* to */
            );
        } else {
            (nftId, exactCollSharesMinted, ) = IFluidVaultT4(_data.vault).operate{ value: msgValue}(
                _data.nftId,
                vars.collAmount0.signed256(),
                vars.collAmount1.signed256(),
                _data.variableData.minCollShares.signed256(),
                0, /* debtAmount0 */
                0, /* debtAmount1 */
                0, /* minDebtShares */
                address(0) /* to */
            );
        }

        collShares = uint256(exactCollSharesMinted);
    }

    function supplyExact(
        FluidDexModel.SupplyDexData memory _data,
        IFluidVault.Tokens memory _tokens
    ) internal returns (uint256 nftId, uint256 collShares) {
        _data.vaultType.requireT2orT4Vault();

        PulledCollateralVars memory vars;

        // We always pull the max amount of collateral0 and refund the difference later
        (vars.collAmount0, vars.isColl0Native) = _pullTokensIfNeededWithApproval(
            _data.exactData.maxCollAmount0,
            _tokens.token0,
            _data.from,
            _data.vault
        );

        // We always pull the max amount of collateral1 and refund the difference later
        (vars.collAmount1, vars.isColl1Native) = _pullTokensIfNeededWithApproval(
            _data.exactData.maxCollAmount1,
            _tokens.token1,
            _data.from,
            _data.vault
        );

        uint256 msgValue = vars.isColl0Native
            ? vars.collAmount0
            : (vars.isColl1Native ? vars.collAmount1 : 0);

        int256[] memory operatePerfectData;

        if (_data.vaultType.isT2Vault()) {
            (nftId, operatePerfectData) = IFluidVaultT2(_data.vault).operatePerfect{ value: msgValue }(
                _data.nftId,
                _data.exactData.perfectCollShares.signed256(),
                vars.collAmount0.signed256(),
                vars.collAmount1.signed256(),
                0, /* debtAmount */
                address(0) /* to */
            );
        } else {
            (nftId, operatePerfectData) = IFluidVaultT4(_data.vault).operatePerfect{ value: msgValue}(
                _data.nftId,
                _data.exactData.perfectCollShares.signed256(),
                vars.collAmount0.signed256(),
                vars.collAmount1.signed256(),
                0, /* perfectDebtShares */
                0, /* minDebtAmount0 */ 
                0, /* minDebtAmount1 */
                address(0) /* to */
            );
        }

        collShares = uint256(operatePerfectData[0]);

        {   // Refund any excess collateral0
            uint256 pulledCollAmount0 = uint256(operatePerfectData[1]);
            if (pulledCollAmount0 < vars.collAmount0) {
                uint256 refund = vars.collAmount0 - pulledCollAmount0;
                // Refund ETH as WETH
                if (vars.isColl0Native) {
                    TokenUtils.depositWeth(refund);
                    TokenUtils.WETH_ADDR.withdrawTokens(_data.from, refund);
                } else {
                    _tokens.token0.withdrawTokens(_data.from, refund);
                    _tokens.token0.approveToken(_data.vault, 0);
                }
            }
        }
        {   // Refund any excess collateral1
            uint256 pulledCollAmount1 = uint256(operatePerfectData[2]);
            if (pulledCollAmount1 < vars.collAmount1) {
                uint256 refund = vars.collAmount1 - pulledCollAmount1;
                // Refund ETH as WETH
                if (vars.isColl1Native) {
                    TokenUtils.depositWeth(refund);
                    TokenUtils.WETH_ADDR.withdrawTokens(_data.from, refund);
                } else {
                    _tokens.token1.withdrawTokens(_data.from, refund);
                    _tokens.token1.approveToken(_data.vault, 0);
                }
            }
        }
    }

    function _pullTokensIfNeededWithApproval(
        uint256 _amount,
        address _token,
        address _from,
        address _approvalTarget
    ) internal returns (uint256 amount, bool isNative) {
        if (_amount == 0) return (0, false);

        if (_token == TokenUtils.ETH_ADDR) {
            _amount = TokenUtils.WETH_ADDR.pullTokensIfNeeded(_from, _amount);
            TokenUtils.withdrawWeth(_amount);
            return (_amount, true);
        }

        _amount = _token.pullTokensIfNeeded(_from, _amount);
        _token.approveToken(_approvalTarget, _amount);

        return (_amount, false);
    }
}