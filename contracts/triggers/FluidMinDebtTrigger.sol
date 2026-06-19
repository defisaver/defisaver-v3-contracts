// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../auth/AdminAuth.sol";
import { ITrigger } from "../interfaces/core/ITrigger.sol";
import { IERC20 } from "../interfaces/token/IERC20.sol";
import {
    IFluidVaultResolver
} from "../interfaces/protocols/fluid/resolvers/IFluidVaultResolver.sol";
import { FluidHelper } from "../actions/fluid/helpers/FluidHelper.sol";
import { ChainlinkPriceLib } from "../utils/ChainlinkPriceLib.sol";

contract FluidMinDebtTrigger is ITrigger, AdminAuth, FluidHelper {
    using ChainlinkPriceLib for address;

    /// @param nftId nft id of the fluid position
    /// @param minDebt minimum debt in whole USD (no decimals, e.g. 5000 for 5000 USD) that the user must have for the trigger to return true
    struct CallDataParams {
        uint256 nftId;
        uint256 minDebt;
    }

    /// @dev getPriceInUSD returns prices with 8 decimals (1e8 == 1 USD).
    uint256 constant ORACLE_PRECISION = 1e8;

    function isTriggered(bytes memory _callData, bytes memory)
        external
        view
        override
        returns (bool)
    {
        CallDataParams memory params = parseCallInputs(_callData);

        (
            IFluidVaultResolver.UserPosition memory userPosition,
            IFluidVaultResolver.VaultEntireData memory vaultData
        ) = IFluidVaultResolver(FLUID_VAULT_RESOLVER).positionByNftId(params.nftId);
        address debtToken = vaultData.constantVariables.borrowToken.token0;
        uint256 totalDebt = userPosition.borrow;

        uint256 debtTokenPrice = debtToken.getPriceInUSD();
        if (debtTokenPrice == 0) return true;

        uint256 debtTokenScale =
            debtToken == NATIVE_TOKEN_ADDR ? 1e18 : 10 ** IERC20(debtToken).decimals();

        /// @dev totalDebt is denominated in debtToken with debtTokenScale decimals, and debtTokenPrice is denominated in USD with 8 decimals.
        return totalDebt * debtTokenPrice >= params.minDebt * ORACLE_PRECISION * debtTokenScale;
    }

    //solhint-disable-next-line no-empty-blocks
    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) { }

    function isChangeable() public pure override returns (bool) {
        return false;
    }

    function parseCallInputs(bytes memory _callData)
        public
        pure
        returns (CallDataParams memory params)
    {
        params = abi.decode(_callData, (CallDataParams));
    }
}
