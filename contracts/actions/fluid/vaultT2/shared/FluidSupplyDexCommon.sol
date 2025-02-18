// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVaultT2 } from "../../../../interfaces/fluid/IFluidVaultT2.sol";
import { TokenUtils } from "../../../../utils/TokenUtils.sol";

contract FluidSupplyDexCommon {
    using TokenUtils for address;

    enum ShareType {
        VARIABLE,
        EXACT
    }

    struct SupplyDexParams {
        address vault;
        ShareType shareType;
        SupplyVariableData variableData;
        SupplyExactData exactData;
        address from;
        uint256 debtAmount;
        address to;
    }

    /// @param collAmount0 Amount of collateral 0 to deposit.
    /// @param collAmount1 Amount of collateral 1 to deposit.
    /// @param minCollShares Min amount of collateral shares to mint.
    struct SupplyVariableData {
        uint256 collAmount0;
        uint256 collAmount1;
        uint256 minCollShares;
    }

    /// @param perfectCollShares Exact amount of shares to mint.
    /// @param maxCollAmount0 Max amount of collateral 0 to deposit.
    /// @param maxCollAmount1 Max amount of collateral 1 to deposit.
    struct SupplyExactData {
        uint256 perfectCollShares;
        uint256 maxCollAmount0;
        uint256 maxCollAmount1;
    }

    // Helper struct to store local variables
    struct PulledCollateralVars {
        uint256 collAmount0;
        uint256 collAmount1;
        bool isColl0Native;
        bool isColl1Native;
    }

    function _supplyDexVariable(
        SupplyDexParams memory _params,
        IFluidVaultT2.Tokens memory _tokens
    ) internal returns (uint256 nftId, uint256 collShares) {
        PulledCollateralVars memory vars;

        (vars.collAmount0, vars.isColl0Native) = _pullTokensIfNeededWithApproval(
            _params.variableData.collAmount0,
            _tokens.token0,
            _params.from,
            _params.vault
        );

        (vars.collAmount1, vars.isColl1Native) = _pullTokensIfNeededWithApproval(
            _params.variableData.collAmount1,
            _tokens.token1,
            _params.from,
            _params.vault
        );

        uint256 msgValue = vars.isColl0Native
            ? vars.collAmount0
            : (vars.isColl1Native ? vars.collAmount1 : 0);

        int exactCollSharesMinted;

        (nftId, exactCollSharesMinted, ) = IFluidVaultT2(_params.vault).operate{ value: msgValue }(
            0, /* _nftId */
            int256(vars.collAmount0),
            int256(vars.collAmount1),
            int256(_params.variableData.minCollShares),
            int256(_params.debtAmount),
            _params.to
        );

        collShares = uint256(exactCollSharesMinted);
    }

    function _supplyDexExact(
        SupplyDexParams memory _params,
        IFluidVaultT2.Tokens memory _tokens
    ) internal returns (uint256 nftId, uint256 collShares) {
        PulledCollateralVars memory vars;

        // We always pull the max amount of collateral0 and refund the difference later
        (vars.collAmount0, vars.isColl0Native) = _pullTokensIfNeededWithApproval(
            _params.exactData.maxCollAmount0,
            _tokens.token0,
            _params.from,
            _params.vault
        );
        // We always pull the max amount of collateral1 and refund the difference later
        (vars.collAmount1, vars.isColl1Native) = _pullTokensIfNeededWithApproval(
            _params.exactData.maxCollAmount1,
            _tokens.token1,
            _params.from,
            _params.vault
        );

        uint256 msgValue = vars.isColl0Native
            ? vars.collAmount0
            : (vars.isColl1Native ? vars.collAmount1 : 0);

        int256[] memory retVals;

        (nftId, retVals) = IFluidVaultT2(_params.vault).operatePerfect{ value: msgValue }(
            0, /* _nftId */
            int256(_params.exactData.perfectCollShares),
            int256(vars.collAmount0),
            int256(vars.collAmount1),
            int256(_params.debtAmount),
            _params.to
        );

        collShares = uint256(retVals[0]);

        {   // Refund any excess collateral0
            uint256 pulledCollAmount0 = uint256(retVals[1]);
            if (pulledCollAmount0 < vars.collAmount0) {
                uint256 refund = vars.collAmount0 - pulledCollAmount0;
                // Refund ETH as WETH
                if (vars.isColl0Native) {
                    TokenUtils.depositWeth(refund);
                    TokenUtils.WETH_ADDR.withdrawTokens(_params.from, refund);
                } else {
                    _tokens.token0.withdrawTokens(_params.from, refund);
                    _tokens.token0.approveToken(_params.vault, 0);
                }
            }
        }
        {   // Refund any excess collateral1
            uint256 pulledCollAmount1 = uint256(retVals[2]);
            if (pulledCollAmount1 < vars.collAmount1) {
                uint256 refund = vars.collAmount1 - pulledCollAmount1;
                // Refund ETH as WETH
                if (vars.isColl1Native) {
                    TokenUtils.depositWeth(refund);
                    TokenUtils.WETH_ADDR.withdrawTokens(_params.from, refund);
                } else {
                    _tokens.token1.withdrawTokens(_params.from, refund);
                    _tokens.token1.approveToken(_params.vault, 0);
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