// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVault } from "../../../../interfaces/fluid/IFluidVault.sol";
import { IFluidVaultT3 } from "../../../../interfaces/fluid/IFluidVaultT3.sol";
import { IFluidVaultT4 } from "../../../../interfaces/fluid/IFluidVaultT4.sol";

import { FluidDexModel } from "../../helpers/FluidDexModel.sol";
import { FluidVaultTypes } from "../../helpers/FluidVaultTypes.sol";

import { TokenUtils } from "../../../../utils/TokenUtils.sol";
import { DFSMath } from "../../../../utils/math/DFSMath.sol";

library FluidBorrowDexLogic {
    using TokenUtils for address;
    using DFSMath for uint256;
    using FluidVaultTypes for uint256;

    function borrowVariable(
        FluidDexModel.BorrowDexData memory _data,
        IFluidVault.Tokens memory _tokens
    ) internal returns (uint256 borrowShares) {
        _data.vaultType.requireT3orT4Vault();

        bool sendDebt0AsWrapped =
            _data.wrapBorrowedEth &&
            _tokens.token0 == TokenUtils.ETH_ADDR &&
            _data.variableData.debtAmount0 > 0;

        bool sendDebt1AsWrapped =
            _data.wrapBorrowedEth &&
            _tokens.token1 == TokenUtils.ETH_ADDR &&
            _data.variableData.debtAmount1 > 0;

        address sendTokensTo = (sendDebt0AsWrapped || sendDebt1AsWrapped) ? address(this) : _data.to;

        int256 exactDebtShares;

        if (_data.vaultType.isT3Vault()) {
            ( , , exactDebtShares) = IFluidVaultT3(_data.vault).operate(
                _data.nftId,
                0, /* newCol_ */
                _data.variableData.debtAmount0.signed256(),
                _data.variableData.debtAmount1.signed256(),
                _data.variableData.minDebtShares.signed256(),
                sendTokensTo
            );
        } else {
            ( , , exactDebtShares) = IFluidVaultT4(_data.vault).operate(
                _data.nftId,
                0, /* newColToken0_ */
                0, /* newColToken1_ */
                0, /* colSharesMinMax_ */
                _data.variableData.debtAmount0.signed256(),
                _data.variableData.debtAmount1.signed256(),
                _data.variableData.minDebtShares.signed256(),
                sendTokensTo
            );
        }

        _sendDebt(
            _tokens,
            _data.to,
            _data.variableData.debtAmount0,
            _data.variableData.debtAmount1,
            sendDebt0AsWrapped,
            sendDebt1AsWrapped
        );

        borrowShares = uint256(exactDebtShares);
    }

    function borrowExact(
        FluidDexModel.BorrowDexData memory _data,
        IFluidVault.Tokens memory _tokens
    ) internal returns (uint256 borrowShares) {
        _data.vaultType.requireT3orT4Vault();

        bool sendDebt0AsWrapped =
            _data.wrapBorrowedEth &&
            _tokens.token0 == TokenUtils.ETH_ADDR &&
            _data.exactData.minDebtAmount0 > 0;

        bool sendDebt1AsWrapped =
            _data.wrapBorrowedEth &&
            _tokens.token1 == TokenUtils.ETH_ADDR &&
            _data.exactData.minDebtAmount1 > 0;

        address sendTokensTo = (sendDebt0AsWrapped || sendDebt1AsWrapped) ? address(this) : _data.to;

        int256[] memory operatePerfectData;

        if (_data.vaultType.isT3Vault()) {
            ( , operatePerfectData) = IFluidVaultT3(_data.vault).operatePerfect(
                _data.nftId,
                0, /* newCol_ */
                _data.exactData.perfectDebtShares.signed256(),
                _data.exactData.minDebtAmount0.signed256(),
                _data.exactData.minDebtAmount1.signed256(),
                sendTokensTo

            );
        } else {
            ( , operatePerfectData) = IFluidVaultT4(_data.vault).operatePerfect(
                _data.nftId,
                0, /* perfectColShares_ */
                0, /* colToken0MinMax_ */
                0, /* colToken1MinMax_ */
                _data.exactData.perfectDebtShares.signed256(),
                _data.exactData.minDebtAmount0.signed256(),
                _data.exactData.minDebtAmount1.signed256(),
                sendTokensTo
            );
        }

        _sendDebt(
            _tokens,
            _data.to,
            uint256(operatePerfectData[2]),
            uint256(operatePerfectData[3]),
            sendDebt0AsWrapped,
            sendDebt1AsWrapped
        );

        borrowShares = uint256(operatePerfectData[1]);
    }

    function _sendDebt(
        IFluidVault.Tokens memory _tokens,
        address _to,
        uint256 _debtAmount0,
        uint256 _debtAmount1,
        bool _sendDebt0AsWrapped,
        bool _sendDebt1AsWrapped
    ) internal {
        if (_sendDebt0AsWrapped) {
            TokenUtils.depositWeth(_debtAmount0);
            TokenUtils.WETH_ADDR.withdrawTokens(_to, _debtAmount0);
            _tokens.token1.withdrawTokens(_to, _debtAmount1);
        }

        if (_sendDebt1AsWrapped) {
            TokenUtils.depositWeth(_debtAmount1);
            TokenUtils.WETH_ADDR.withdrawTokens(_to, _debtAmount1);
            _tokens.token0.withdrawTokens(_to, _debtAmount0);
        }
    }
}