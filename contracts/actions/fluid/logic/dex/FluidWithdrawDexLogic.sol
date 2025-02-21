// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVault } from "../../../../interfaces/fluid/IFluidVault.sol";
import { IFluidVaultT2 } from "../../../../interfaces/fluid/IFluidVaultT2.sol";
import { IFluidVaultT4 } from "../../../../interfaces/fluid/IFluidVaultT4.sol";

import { FluidDexModel } from "../../helpers/FluidDexModel.sol";
import { FluidVaultTypes } from "../../helpers/FluidVaultTypes.sol";

import { TokenUtils } from "../../../../utils/TokenUtils.sol";
import { DFSMath } from "../../../../utils/math/DFSMath.sol";

library FluidWithdrawDexLogic {
    using TokenUtils for address;
    using DFSMath for uint256;
    using FluidVaultTypes for uint256;

    function withdrawVariable(
        FluidDexModel.WithdrawDexData memory _data,
        IFluidVault.Tokens memory _tokens
    ) internal returns (uint256 collSharesBurned) {
        _data.vaultType.requireT2orT4Vault();

        bool sendColl0AsWrapped =
            _data.wrapWithdrawnEth &&
            _tokens.token0 == TokenUtils.ETH_ADDR &&
            _data.variableData.collAmount0 > 0;

        bool sendColl1AsWrapped =
            _data.wrapWithdrawnEth &&
            _tokens.token1 == TokenUtils.ETH_ADDR &&
            _data.variableData.collAmount1 > 0;

        address sendTokensTo = (sendColl0AsWrapped || sendColl1AsWrapped) ? address(this) : _data.to;

        int256 exactCollSharesBurned;

        if (_data.vaultType.isT2Vault()) {
            ( , exactCollSharesBurned , ) = IFluidVaultT2(_data.vault).operate(
                _data.nftId,
                -_data.variableData.collAmount0.signed256(),
                -_data.variableData.collAmount1.signed256(),
                -_data.variableData.maxCollShares.signed256(),
                0, /* newDebt_ */
                sendTokensTo
            );
        } else {
            ( , exactCollSharesBurned , ) = IFluidVaultT4(_data.vault).operate(
                _data.nftId,
                -_data.variableData.collAmount0.signed256(),
                -_data.variableData.collAmount1.signed256(),
                -_data.variableData.maxCollShares.signed256(),
                0, /* newDebtToken0_ */
                0, /* newDebtToken1_ */
                0, /* debtSharesMinMax_ */
                sendTokensTo
            );
        }
        
        if (sendColl0AsWrapped) {
            TokenUtils.depositWeth(_data.variableData.collAmount0);
            TokenUtils.WETH_ADDR.withdrawTokens(_data.to, _data.variableData.collAmount0);

            if (_data.variableData.collAmount1 > 0) {
                _tokens.token1.withdrawTokens(_data.to, _data.variableData.collAmount1);
            }
        }

        if (sendColl1AsWrapped) {
            TokenUtils.depositWeth(_data.variableData.collAmount1);
            TokenUtils.WETH_ADDR.withdrawTokens(_data.to, _data.variableData.collAmount1);

            if (_data.variableData.collAmount0 > 0) {
                _tokens.token0.withdrawTokens(_data.to, _data.variableData.collAmount0);
            }
        }

        _sendColl(
            _tokens,
            _data.to,
            _data.variableData.collAmount0,
            _data.variableData.collAmount1,
            sendColl0AsWrapped,
            sendColl1AsWrapped
        );

        collSharesBurned = uint256(-exactCollSharesBurned);
    }

    function withdrawExact(
        FluidDexModel.WithdrawDexData memory _data,
        IFluidVault.Tokens memory _tokens
    ) internal returns (uint256 collSharesBurned) {
        _data.vaultType.requireT2orT4Vault();

        bool sendColl0AsWrapped =
            _data.wrapWithdrawnEth &&
            _tokens.token0 == TokenUtils.ETH_ADDR &&
            _data.exactData.minCollAmount0 > 0;

        bool sendColl1AsWrapped =
            _data.wrapWithdrawnEth &&
            _tokens.token1 == TokenUtils.ETH_ADDR &&
            _data.exactData.minCollAmount1 > 0;

        address sendTokensTo = (sendColl0AsWrapped || sendColl1AsWrapped) ? address(this) : _data.to;

        // type(int256).min will burn all the user's shares inside the vault
        int256 sharesToBurn = _data.exactData.perfectCollShares == type(uint256).max
            ? type(int256).min
            : -_data.exactData.perfectCollShares.signed256();

        int256[] memory operatePerfectData;

        if (_data.vaultType.isT2Vault()) {
            ( , operatePerfectData ) = IFluidVaultT2(_data.vault).operatePerfect(
                _data.nftId,
                sharesToBurn,
                -_data.exactData.minCollAmount0.signed256(),
                -_data.exactData.minCollAmount1.signed256(),
                0, /* newDebt_ */
                sendTokensTo
            );
        } else {
            ( , operatePerfectData ) = IFluidVaultT4(_data.vault).operatePerfect(
                _data.nftId,
                sharesToBurn,
                -_data.exactData.minCollAmount0.signed256(),
                -_data.exactData.minCollAmount1.signed256(),
                0, /* perfectDebtShares_ */
                0, /* debtToken0MinMax_ */
                0, /* debtToken1MinMax_ */
                sendTokensTo
            );
        }

        _sendColl(
            _tokens,
            _data.to,
            uint256(-operatePerfectData[1]),
            uint256(-operatePerfectData[2]),
            sendColl0AsWrapped,
            sendColl1AsWrapped
        );

        collSharesBurned = uint256(-operatePerfectData[0]);
    }

    function _sendColl(
        IFluidVault.Tokens memory _tokens,
        address _to,
        uint256 _collAmount0,
        uint256 _collAmount1,
        bool _sendColl0AsWrapped,
        bool _sendColl1AsWrapped
    ) internal {
        if (_sendColl0AsWrapped) {
            TokenUtils.depositWeth(_collAmount0);
            TokenUtils.WETH_ADDR.withdrawTokens(_to, _collAmount0);
            _tokens.token1.withdrawTokens(_to, _collAmount1);
        }

        if (_sendColl1AsWrapped) {
            TokenUtils.depositWeth(_collAmount1);
            TokenUtils.WETH_ADDR.withdrawTokens(_to, _collAmount1);
            _tokens.token0.withdrawTokens(_to, _collAmount0);
        }
    }
}