// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../auth/AdminAuth.sol";
import { ITrigger } from "../interfaces/core/ITrigger.sol";
import { IPoolV3 } from "../interfaces/protocols/aaveV3/IPoolV3.sol";
import { IPoolAddressesProvider } from "../interfaces/protocols/aaveV3/IPoolAddressesProvider.sol";

contract AaveV3MinDebtTrigger is ITrigger, AdminAuth {
    /// @param user address of the user whose position we check
    /// @param market aaveV3 market address
    /// @param minDebt minimum debt in USD (8 decimals) that the user must have for the trigger to return true
    struct CalldataParams {
        address user;
        address market;
        uint256 minDebt;
    }

    function isTriggered(bytes memory _calldata, bytes memory)
        external
        view
        override
        returns (bool)
    {
        CalldataParams memory params = parseCallInputs(_calldata);

        IPoolV3 lendingPool = IPoolV3(IPoolAddressesProvider(params.market).getPool());
        (, uint256 totalDebtUSD,,,,) = lendingPool.getUserAccountData(params.user);

        return totalDebtUSD >= params.minDebt;
    }

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
