// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVaultT1 } from "../../../../interfaces/fluid/IFluidVaultT1.sol";
import { IFluidVaultT2 } from "../../../../interfaces/fluid/IFluidVaultT2.sol";

import { FluidLiquidityModel } from "../../helpers/FluidLiquidityModel.sol";
import { FluidVaultTypes } from "../../helpers/FluidVaultTypes.sol";

import { TokenUtils } from "../../../../utils/TokenUtils.sol";
import { DFSMath } from "../../../../utils/math/DFSMath.sol";

library FluidBorrowLiquidityLogic {
    using TokenUtils for address;
    using DFSMath for uint256;
    using FluidVaultTypes for uint256;

    function borrow(
        FluidLiquidityModel.BorrowData memory _data
    ) internal returns (uint256) {
        _data.vaultType.requireT1orT2Vault();

        bool shouldWrapBorrowedEth = _data.wrapBorrowedEth && _data.borrowToken == TokenUtils.ETH_ADDR;

        address sendTokensTo = shouldWrapBorrowedEth ? address(this) : _data.to;

        if (_data.vaultType.isT1Vault()) {
            IFluidVaultT1(_data.vault).operate(
                _data.nftId,
                0, /* newColl */
                _data.amount.signed256(),
                sendTokensTo
            );
        } else {
            IFluidVaultT2(_data.vault).operate(
                _data.nftId,
                0, /* newColToken0_ */
                0, /* newColToken1_ */
                0, /* colSharesMinMax_ */
                _data.amount.signed256(),
                sendTokensTo
            );
        }

        if (shouldWrapBorrowedEth) {
            TokenUtils.depositWeth(_data.amount);
            TokenUtils.WETH_ADDR.withdrawTokens(_data.to, _data.amount);
        }

        return _data.amount;
    }
}