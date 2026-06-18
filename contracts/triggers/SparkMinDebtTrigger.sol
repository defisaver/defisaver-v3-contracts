// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../auth/AdminAuth.sol";
import { ITrigger } from "../interfaces/core/ITrigger.sol";
import { IPoolV3 } from "../interfaces/protocols/aaveV3/IPoolV3.sol";
import { IPoolAddressesProvider } from "../interfaces/protocols/aaveV3/IPoolAddressesProvider.sol";
import { ISparkPool } from "../interfaces/protocols/spark/ISparkPool.sol";
import {
    ISparkPoolAddressesProvider
} from "../interfaces/protocols/spark/ISparkPoolAddressesProvider.sol";
import { MainnetSparkAddresses } from "../actions/spark/helpers/MainnetSparkAddresses.sol";

contract SparkMinDebtTrigger is ITrigger, AdminAuth, MainnetSparkAddresses {
    /// @param user address of the user whose position we check
    /// @param minDebt minimum debt in whole USD (no decimals, e.g. 5000 for 5000 USD) that the user must have for the trigger to return true
    struct CalldataParams {
        address user;
        uint256 minDebt;
    }

    /// @dev totalDebtUSD is denominated in USD with 8 decimals, so 1e8 == 1 USD.
    uint256 constant PRECISION = 1e8;

    function isTriggered(bytes memory _calldata, bytes memory)
        external
        view
        override
        returns (bool)
    {
        CalldataParams memory params = parseCallInputs(_calldata);

        ISparkPool lendingPool =
            ISparkPool(ISparkPoolAddressesProvider(DEFAULT_SPARK_MARKET).getPool());
        (, uint256 totalDebtUSD,,,,) = lendingPool.getUserAccountData(params.user);

        return totalDebtUSD >= params.minDebt * PRECISION;
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
