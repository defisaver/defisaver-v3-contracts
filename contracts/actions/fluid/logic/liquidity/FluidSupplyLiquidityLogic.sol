// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVaultT1 } from "../../../../interfaces/fluid/IFluidVaultT1.sol";
import { IFluidVaultT3 } from "../../../../interfaces/fluid/IFluidVaultT3.sol";

import { FluidLiquidityModel } from "../../helpers/FluidLiquidityModel.sol";
import { FluidVaultTypes } from "../../helpers/FluidVaultTypes.sol";

import { TokenUtils } from "../../../../utils/TokenUtils.sol";
import { DFSMath } from "../../../../utils/math/DFSMath.sol";

library FluidSupplyLiquidityLogic {
    using TokenUtils for address;
    using DFSMath for uint256;
    using FluidVaultTypes for uint256;

    function supply(
        FluidLiquidityModel.SupplyData memory _data
    ) internal returns (uint256 nftId, uint256 supplyAmount) {
        _data.vaultType.requireT1orT3Vault();

        uint256 msgValue;

        if (_data.supplyToken == TokenUtils.ETH_ADDR) {
            _data.amount = TokenUtils.WETH_ADDR.pullTokensIfNeeded(_data.from, _data.amount);
            TokenUtils.withdrawWeth(_data.amount);
            msgValue = _data.amount;
        } else {
            _data.amount = _data.supplyToken.pullTokensIfNeeded(_data.from, _data.amount);
            _data.supplyToken.approveToken(_data.vault, _data.amount);
        }
        
        if (_data.vaultType.isT1Vault()) {
            (nftId , , ) = IFluidVaultT1(_data.vault).operate{ value: msgValue }(
                _data.nftId,
                _data.amount.signed256(),
                _data.debtAmount.signed256(),
                _data.debtTo
            );

            return (nftId, _data.amount);
        }

        // We are not using the borrow data in this case.
        // So calling 'operate' or 'operatePerfect' on vault contract will have the same effect.
        (nftId , ) = IFluidVaultT3(_data.vault).operatePerfect{ value: msgValue }(
            _data.nftId,
            _data.amount.signed256(),
            0, /* perfectDebtShares */
            0, /* minDebtAmount0 */
            0, /* minDebtAmount1 */
            address(0) /* to */
        );

        return (nftId, _data.amount);
    }
}