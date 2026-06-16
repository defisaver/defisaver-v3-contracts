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
    /// @param minDebt minimum debt in USD that the user must have for the trigger to return true
    struct SubParams {
        address user;
        uint256 minDebt;
    }

    function isTriggered(bytes memory, bytes memory _subData)
        external
        view
        override
        returns (bool)
    {
        SubParams memory params = parseSubInputs(_subData);

        ISparkPool lendingPool =
            ISparkPool(ISparkPoolAddressesProvider(DEFAULT_SPARK_MARKET).getPool());
        (, uint256 totalDebtUSD,,,,) = lendingPool.getUserAccountData(params.user);

        return totalDebtUSD >= params.minDebt;
    }

    function parseSubInputs(bytes memory _subData) public pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }

    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) { }

    function isChangeable() public pure override returns (bool) {
        return false;
    }
}
