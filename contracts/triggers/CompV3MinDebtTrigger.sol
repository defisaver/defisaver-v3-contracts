// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IComet } from "../interfaces/protocols/compoundV3/IComet.sol";
import { ITrigger } from "../interfaces/core/ITrigger.sol";
import { AdminAuth } from "../auth/AdminAuth.sol";
import { ChainlinkPriceLib } from "../utils/ChainlinkPriceLib.sol";

contract CompV3MinDebtTrigger is ITrigger, AdminAuth {
    using ChainlinkPriceLib for address;

    /// @param user address of the user whose position we check
    /// @param market address of the compoundV3 market
    /// @param minDebt minimum debt in whole USD (no decimals, e.g. 5000 for 5000 USD) that the user must have for the trigger to return true
    struct CalldataParams {
        address user;
        address market;
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
        CalldataParams memory triggerData = parseCallInputs(_calldata);

        IComet comet = IComet(triggerData.market);
        address baseToken = comet.baseToken();
        uint256 totalDebt = comet.borrowBalanceOf(triggerData.user);
        uint256 baseTokenPrice = baseToken.getPriceInUSD();
        if (baseTokenPrice == 0) return true;

        /// @dev totalDebt is denominated in baseToken with baseScale decimals, and baseTokenPrice is denominated in USD with 8 decimals.
        return
            totalDebt * baseTokenPrice >= triggerData.minDebt * ORACLE_PRECISION * comet.baseScale();
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
