// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVault } from "../../../../interfaces/fluid/IFluidVault.sol";
import { IFluidVaultT3 } from "../../../../interfaces/fluid/IFluidVaultT3.sol";
import { IFluidVaultT4 } from "../../../../interfaces/fluid/IFluidVaultT4.sol";

import { FluidDexModel } from "../../helpers/FluidDexModel.sol";
import { FluidVaultTypes } from "../../helpers/FluidVaultTypes.sol";

import { TokenUtils } from "../../../../utils/TokenUtils.sol";
import { DFSMath } from "../../../../utils/math/DFSMath.sol";

library FluidPaybackDexLogic {
    using TokenUtils for address;
    using DFSMath for uint256;
    using FluidVaultTypes for uint256;

    // Helper struct to store local variables
    struct PulledDebtVars {
        uint256 debtAmount0;
        uint256 debtAmount1;
        bool isDebt0Native;
        bool isDebt1Native;
    }

    function paybackVariable(
        FluidDexModel.PaybackDexData memory _data,
        IFluidVault.Tokens memory _tokens
    ) internal returns (uint256 burnedShares) {
        _data.vaultType.requireT3orT4Vault();

        PulledDebtVars memory vars;

        (vars.debtAmount0, vars.isDebt0Native) = _pullTokensIfNeededWithApproval(
            _data.variableData.debtAmount0,
            _tokens.token0,
            _data.from,
            _data.vault
        );

        (vars.debtAmount1, vars.isDebt1Native) = _pullTokensIfNeededWithApproval(
            _data.variableData.debtAmount1,
            _tokens.token1,
            _data.from,
            _data.vault
        );

        uint256 msgValue = vars.isDebt0Native
            ? vars.debtAmount0
            : (vars.isDebt1Native ? vars.debtAmount1 : 0);

        int256 exactBorrowSharesBurned;

        if (_data.vaultType.isT3Vault()) {
            ( , , exactBorrowSharesBurned) = IFluidVaultT3(_data.vault).operate{ value: msgValue }(
                _data.nftId,
                0, /* newCol_ */
                -vars.debtAmount0.signed256(),
                -vars.debtAmount1.signed256(),
                -_data.variableData.maxDebtShares.signed256(),
                address(0) /* to */
            );
        } else {
            ( , , exactBorrowSharesBurned) = IFluidVaultT4(_data.vault).operate(
                _data.nftId,
                0, /* newColToken0_ */
                0, /* newColToken1_ */
                0, /* colSharesMinMax_ */
                -vars.debtAmount0.signed256(),
                -vars.debtAmount1.signed256(),
                -_data.variableData.maxDebtShares.signed256(),
                address(0) /* to_ */
            );
        }

        burnedShares = uint256(-exactBorrowSharesBurned);
    }

    function paybackExact(
        FluidDexModel.PaybackDexData memory _data,
        IFluidVault.Tokens memory _tokens
    ) internal returns (uint256 burnedShares) {
        _data.vaultType.requireT3orT4Vault();

        PulledDebtVars memory vars;

        // We always pull the max amount of debt0 and refund the difference later
        (vars.debtAmount0, vars.isDebt0Native) = _pullTokensIfNeededWithApproval(
            _data.exactData.maxDebtAmount0,
            _tokens.token0,
            _data.from,
            _data.vault
        );

        // We always pull the max amount of debt1 and refund the difference later
        (vars.debtAmount1, vars.isDebt1Native) = _pullTokensIfNeededWithApproval(
            _data.exactData.maxDebtAmount1,
            _tokens.token1,
            _data.from,
            _data.vault
        );

        uint256 msgValue = vars.isDebt0Native
            ? vars.debtAmount0
            : (vars.isDebt1Native ? vars.debtAmount1 : 0);

        // Cap shares to max payback amount if needed
        // type(int256).min will trigger max payback inside the vault.
        int256 perfectDebtShares = _data.exactData.perfectDebtShares >= _data.position.borrow
            ? type(int256).min
            : -_data.exactData.perfectDebtShares.signed256();

        int256[] memory operatePerfectData;

        if (_data.vaultType.isT3Vault()) {
            (, operatePerfectData) = IFluidVaultT3(_data.vault).operatePerfect{ value: msgValue }(
                _data.nftId,
                0, /* newCol_ */
                perfectDebtShares,
                -vars.debtAmount0.signed256(),
                -vars.debtAmount1.signed256(),
                address(0) /* to_ */
            );
        } else {
            (, operatePerfectData) = IFluidVaultT4(_data.vault).operatePerfect{ value: msgValue }(
                _data.nftId,
                0, /* newColToken0_ */
                0, /* newColToken1_ */
                0, /* colSharesMinMax_ */
                perfectDebtShares,
                -vars.debtAmount0.signed256(),
                -vars.debtAmount1.signed256(),
                address(0) /* to_ */
            );
        }

        // See IFluidVaultT3 and IFluidVaultT4 for the return values indexing
        burnedShares = uint256(-operatePerfectData[_data.vaultType.isT3Vault() ? 1 : 3]);

        {   // Refund any excess debt0
            uint256 pulledDebtAmount0 = uint256(-operatePerfectData[_data.vaultType.isT3Vault() ? 2 : 4]);
            if (pulledDebtAmount0 < vars.debtAmount0) {
                uint256 refund = vars.debtAmount0 - pulledDebtAmount0;
                // Refund ETH as WETH
                if (vars.isDebt0Native) {
                    TokenUtils.depositWeth(refund);
                    TokenUtils.WETH_ADDR.withdrawTokens(_data.from, refund);
                } else {
                    _tokens.token0.withdrawTokens(_data.from, refund);
                    _tokens.token0.approveToken(_data.vault, 0);
                }
            }
        }
        {   // Refund any excess debt1
            uint256 pulledDebtAmount1 = uint256(-operatePerfectData[_data.vaultType.isT3Vault() ? 3 : 5]);
            if (pulledDebtAmount1 < vars.debtAmount1) {
                uint256 refund = vars.debtAmount1 - pulledDebtAmount1;
                // Refund ETH as WETH
                if (vars.isDebt1Native) {
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