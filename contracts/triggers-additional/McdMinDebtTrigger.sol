// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ITrigger } from "../interfaces/core/ITrigger.sol";
import { AdminAuth } from "../auth/AdminAuth.sol";
import { McdRatioHelper } from "../actions/mcd/helpers/McdRatioHelper.sol";

contract McdMinDebtTrigger is ITrigger, AdminAuth, McdRatioHelper {
    /// @param cdpId id of the MCD vault (CDP) whose debt we check
    /// @param minDebt minimum debt in whole USD (no decimals, e.g. 5000 for 5000 USD) that the user must have for the trigger to return true
    struct CalldataParams {
        uint256 cdpId;
        uint256 minDebt;
    }

    /// @dev MCD debt is always denominated in DAI, which has 18 decimals. We assume 1 DAI == 1 USD.
    uint256 constant PRECISION = 1e18;

    function isTriggered(bytes memory _calldata, bytes memory)
        external
        view
        override
        returns (bool)
    {
        CalldataParams memory params = parseCallInputs(_calldata);

        bytes32 ilk = manager.ilks(params.cdpId);
        (, uint256 totalDebt) = getCdpInfo(params.cdpId, ilk);

        return totalDebt >= params.minDebt * PRECISION;
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
