// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVaultResolver } from "../../../interfaces/protocols/fluid/resolvers/IFluidVaultResolver.sol";
import { FluidHelper } from "./FluidHelper.sol";

/// @title Helper contract for Fluid ratio calculations.
contract FluidRatioHelper is FluidHelper {
    uint256 internal constant PRICE_SCALER = 1e27;
    uint256 internal constant WAD = 1e18;

    /// @notice Gets ratio for a fluid position
    /// @param _nftId nft id of the fluid position
    /// @return ratio Ratio of the position
    function getRatio(uint256 _nftId) public view returns (uint256 ratio) {
        (IFluidVaultResolver.UserPosition memory userPosition, IFluidVaultResolver.VaultEntireData memory vaultData) =
            IFluidVaultResolver(FLUID_VAULT_RESOLVER).positionByNftId(_nftId);

        if (userPosition.borrow == 0 || userPosition.supply == 0) return uint256(0);

        uint256 collAmountInDebtToken = (userPosition.supply * vaultData.configs.oraclePriceOperate) / PRICE_SCALER;

        ratio = collAmountInDebtToken * WAD / userPosition.borrow;
    }
}
