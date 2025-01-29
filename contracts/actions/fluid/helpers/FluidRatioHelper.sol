// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IERC20 } from "../../../interfaces/IERC20.sol";
import { IFluidVaultResolver } from "../../../interfaces/fluid/IFluidVaultResolver.sol";
import { FluidHelper } from "./FluidHelper.sol";
import { DSMath } from "../../../DS/DSMath.sol";

/// @title Helper methods for Fluid ratio calc.
contract FluidRatioHelper is DSMath, FluidHelper {

    uint256 internal constant T1_VAULT_ID = 10000;
    uint256 internal constant T2_VAULT_ID = 20000;
    uint256 internal constant T3_VAULT_ID = 30000;
    uint256 internal constant T4_VAULT_ID = 40000;

    uint256 internal constant ORACLE_PRICE_DECIMALS = 27;

    /// @notice Gets ratio for a fluid position
    /// @param _nftId nft id of the fluid position
    function getRatio(uint256 _nftId) public view returns (uint256 ratio) {
        (
            IFluidVaultResolver.UserPosition memory userPosition,
            IFluidVaultResolver.VaultEntireData memory vaultData
        ) = IFluidVaultResolver(FLUID_VAULT_RESOLVER).positionByNftId(_nftId);

        // TODO: For now, only handle the case for T1 Vaults
        if (vaultData.constantVariables.vaultId == T1_VAULT_ID) {
            uint256 collAmount = userPosition.supply;
            uint256 debtAmount = userPosition.borrow;

            if (debtAmount == 0) return uint256(0);

            uint256 collDec = IERC20(vaultData.constantVariables.supplyToken.token0).decimals();
            uint256 debtDec = IERC20(vaultData.constantVariables.borrowToken.token0).decimals();

            /// @dev Examples:
            // price = Price of collateral token in debt token scaled by priceScaler
            // priceScaler = 10 ** (ORACLE_PRICE_DECIMALS - collDec + debtDec)
            //
            // 1. (2.5 WBTC / 50k USDC)
            // price = 1028534478997854690000000000000 / 10 ** (27 - 8 + 6) = 102853.44789978547
            // collAmount = 2.5 * 1e8
            // debtAmount = 50000 * 1e6
            // ratio = 2.5 * 1e8 * 1028534478997854690000000000000 * 1e6 * 1e18 / 10 ** (27 - 8 + 6) / 1e8 / (50000 * 1e6)
            //       = 5.142672394989273e18
            //
            // 2. (3.2 weETH / 1.5 wstETH)
            // price = 888143936867381715436793889 / 10 ** (27 - 18 + 18) = 0.8881439368673817
            // collAmount = 3.2 * 1e18
            // debtAmount = 1.5 * 1e18
            // ratio = 3.2 * 1e18 * 888143936867381715436793889 * 1e18 * 1e18 / 10 ** (27 - 18 + 18) / 1e18 / (1.5 * 1e18)
            //       = 1.894707065317081e18
            //
            // 3. (2 WBTC / 30 ETH)
            // price =  321857633689348920539866335783307690682 / 10 ** (27 - 8 + 18) = 32.18576336893489
            // collAmount = 2 * 1e8
            // debtAmount = 30 * 1e18
            // ratio = 2 * 1e8 * 321857633689348920539866335783307690682 * 1e18 * 1e18 / 10 ** (27 - 8 + 18) / 1e8 / (30 * 1e18)
            //       = 2.1457175579289923e18
            //
            uint256 price = vaultData.configs.oraclePriceOperate;
            uint256 priceScaler = 10 ** (ORACLE_PRICE_DECIMALS - collDec + debtDec);

            ratio = collAmount * price * (10 ** debtDec) * WAD / priceScaler / (10 ** collDec) / debtAmount;
        }

        return 0;
    }
}