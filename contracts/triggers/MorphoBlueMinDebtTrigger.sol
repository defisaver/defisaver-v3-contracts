// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ITrigger } from "../interfaces/core/ITrigger.sol";
import { AdminAuth } from "../auth/AdminAuth.sol";
import { IERC20 } from "../interfaces/token/IERC20.sol";
import { Id, MarketParams, IMorphoBlue } from "../interfaces/protocols/morpho-blue/IMorphoBlue.sol";
import {
    MainnetMorphoBlueAddresses
} from "../actions/morpho-blue/helpers/MainnetMorphoBlueAddresses.sol";
import { MorphoBalancesLib } from "../actions/morpho-blue/helpers/MorphoBlueLib.sol";
import { ChainlinkPriceLib } from "../utils/ChainlinkPriceLib.sol";

contract MorphoBlueMinDebtTrigger is ITrigger, AdminAuth, MainnetMorphoBlueAddresses {
    using ChainlinkPriceLib for address;

    IMorphoBlue public constant morphoBlue = IMorphoBlue(MORPHO_BLUE_ADDRESS);

    /// @param user address of the user whose position we check
    /// @param marketId bytes32 representing a MorphoBlue market
    /// @param minDebt minimum debt in whole USD (no decimals, e.g. 5000 for 5000 USD) that the user must have for the trigger to return true
    struct CalldataParams {
        address user;
        Id marketId; // this is bytes32
        uint256 minDebt;
    }

    /// @dev getPriceInUSD returns prices with 8 decimals (1e8 == 1 USD).
    uint256 constant ORACLE_PRECISION = 1e8;

    function isTriggered(bytes memory _calldata, bytes memory)
        external
        view
        override
        returns (bool)
    {
        CalldataParams memory params = parseCallInputs(_calldata);

        MarketParams memory marketParams = morphoBlue.idToMarketParams(params.marketId);

        uint256 totalDebt =
            MorphoBalancesLib.expectedBorrowAssets(morphoBlue, marketParams, params.user);

        uint256 loanTokenPrice = marketParams.loanToken.getPriceInUSD();
        if (loanTokenPrice == 0) return true;

        uint256 loanTokenScale = 10 ** IERC20(marketParams.loanToken).decimals();

        /// @dev totalDebt is denominated in loanToken with loanTokenScale decimals, and loanTokenPrice is denominated in USD with 8 decimals.
        return totalDebt * loanTokenPrice >= params.minDebt * ORACLE_PRECISION * loanTokenScale;
    }

    //solhint-disable-next-line no-empty-blocks
    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) { }

    function isChangeable() public pure override returns (bool) {
        return false;
    }

    function parseCallInputs(bytes memory _callData)
        public
        pure
        returns (CalldataParams memory params)
    {
        params = abi.decode(_callData, (CalldataParams));
    }
}
