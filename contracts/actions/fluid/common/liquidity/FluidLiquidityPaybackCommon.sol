// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVaultT1 } from "../../../../interfaces/fluid/IFluidVaultT1.sol";
import { IFluidVaultT2 } from "../../../../interfaces/fluid/IFluidVaultT2.sol";
import { IFluidVaultResolver } from "../../../../interfaces/fluid/IFluidVaultResolver.sol";
import { FluidHelper } from "../../helpers/FluidHelper.sol";
import { TokenUtils } from "../../../../utils/TokenUtils.sol";

contract FluidLiquidityPaybackCommon is FluidHelper {
    using TokenUtils for address;

    error InvalidVaultType(uint256 vaultType);

    struct LiquidityPaybackParams {
        address from;
        address vault;
        address borrowToken;
        uint256 nftId;
        uint256 amount;
        uint256 vaultType;
    }

    function _liquidityPayback(
        LiquidityPaybackParams memory _params
    ) internal returns (uint256) {
        _requireT1orT2Vault(_params.vaultType);

        bool isEthPayback = _params.borrowToken == TokenUtils.ETH_ADDR;

        (IFluidVaultResolver.UserPosition memory userPosition, ) = 
            IFluidVaultResolver(FLUID_VAULT_RESOLVER).positionByNftId(_params.nftId);

        uint256 borrowTokenBalanceBefore;
        bool maxPayback;
        if (_params.amount > userPosition.borrow) {
            maxPayback = true;
            // The exact full payback amount is dynamically calculated inside the vault and can surpass the recorded debt.
            // To account for this, we need to pull slightly more than the recorded debt.
            // We will increase the amount by 0.001% and add an extra fixed margin of 5 units.
            // Note that even though an amount higher than the recorded debt is categorized as max payback,
            // the user must still have sufficient tokens and allowance to cover this extra amount.
            _params.amount = userPosition.borrow * 100001 / 100000 + 5;
            // If we pull more than necessary, we will take a snapshot and refund any dust amount.
            borrowTokenBalanceBefore = isEthPayback
                ? address(this).balance
                : _params.borrowToken.getBalance(address(this));
        }

        if (isEthPayback) {
            _params.amount = TokenUtils.WETH_ADDR.pullTokensIfNeeded(_params.from, _params.amount);
            TokenUtils.withdrawWeth(_params.amount);
        } else {
            _params.amount = _params.borrowToken.pullTokensIfNeeded(_params.from, _params.amount);
            _params.borrowToken.approveToken(_params.vault, _params.amount);
        }

        // type(int256).min will trigger max payback inside the vault.
        int256 paybackAmount =  maxPayback ? type(int256).min : -int256(_params.amount);

        // If we send more ETH than needed, the vault will refund the dust.
        uint256 msgValue = isEthPayback ? _params.amount : 0;

        int256 exactPaybackAmount = _executePayback(
            _params.vault,
            _params.vaultType,
            _params.nftId,
            paybackAmount,
            msgValue
        );

        if (maxPayback) {
            uint256 borrowTokenBalanceAfter = isEthPayback
                ? address(this).balance
                : _params.borrowToken.getBalance(address(this));

            // Sanity check: if we didn't perform a max payback directly from the wallet,
            // the number of borrowed tokens should not decrease.
            if (_params.from != address(this)) {
                require(borrowTokenBalanceAfter >= borrowTokenBalanceBefore);
            }

            // We pulled slightly more than needed, so refund dust amount to 'from' address.
            if (borrowTokenBalanceAfter > borrowTokenBalanceBefore) {
                uint256 dustAmount = borrowTokenBalanceAfter - borrowTokenBalanceBefore;
                // This also supports plain ETH.
                _params.borrowToken.withdrawTokens(_params.from, dustAmount);
                // Remove any dust approval left.
                if (!isEthPayback) {
                    _params.borrowToken.approveToken(_params.vault, 0);
                }
            }
        }

        return (uint256(-exactPaybackAmount));
    }

    function _requireT1orT2Vault(uint256 _vaultType) internal pure {
        if (_vaultType != T1_VAULT_TYPE && _vaultType != T2_VAULT_TYPE) {
            revert InvalidVaultType(_vaultType);
        }
    }

    function _executePayback(
        address _vault,
        uint256 _vaultType,
        uint256 _nftId,
        int256 _paybackAmount,
        uint256 _msgValue
    ) internal returns (int256 exactPaybackAmount) {
        if (_vaultType == T1_VAULT_TYPE) {
            ( , , exactPaybackAmount) = IFluidVaultT1(_vault).operate{value: _msgValue}(
                _nftId,
                0,
                _paybackAmount,
                address(0)
            );
            return exactPaybackAmount;
        } 

        ( , , exactPaybackAmount) = IFluidVaultT2(_vault).operate{value: _msgValue}(
            _nftId,
            0, /* newColToken0_ */
            0, /* newColToken1_ */
            0, /* colSharesMinMax_ */
            _paybackAmount,
            address(0)
        );
    }
}