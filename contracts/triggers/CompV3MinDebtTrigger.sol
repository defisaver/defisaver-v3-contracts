// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IComet } from "../interfaces/protocols/compoundV3/IComet.sol";
import { ITrigger } from "../interfaces/core/ITrigger.sol";
import { AdminAuth } from "../auth/AdminAuth.sol";
import { ChainlinkPriceLib } from "../utils/ChainlinkPriceLib.sol";

contract CompV3MinDebtTrigger is ITrigger, AdminAuth {
    using ChainlinkPriceLib for address;

    /// @param market address of the compoundV3 market
    /// @param user address of the user that will be used to store the current ratio for.
    /// @param minDebt minimum debt in USD (8 decimals) that the user must have for the trigger to return true
    struct SubParams {
        address market;
        address user;
        uint256 minDebt;
    }

    function isTriggered(bytes memory, bytes memory _subData)
        external
        view
        override
        returns (bool)
    {
        SubParams memory triggerData = parseSubInputs(_subData);

        IComet comet = IComet(triggerData.market);
        address baseToken = comet.baseToken();
        uint256 totalDebt = comet.borrowBalanceOf(triggerData.user);
        uint256 baseTokenPrice = baseToken.getPriceInUSD();
        if (baseTokenPrice == 0) return true;

        // baseToken price has 8 decimals, baseScale == 10 ** baseToken.decimals(),
        // so totalDebtUSD is denominated in USD with 8 decimals.
        uint256 totalDebtUSD = totalDebt * baseTokenPrice / comet.baseScale();

        return totalDebtUSD >= triggerData.minDebt;
    }

    //solhint-disable-next-line no-empty-blocks
    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) { }

    function isChangeable() public pure override returns (bool) {
        return false;
    }

    function parseSubInputs(bytes memory _callData) public pure returns (SubParams memory params) {
        params = abi.decode(_callData, (SubParams));
    }
}
