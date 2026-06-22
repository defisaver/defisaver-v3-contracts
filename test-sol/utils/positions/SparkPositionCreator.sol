// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { CommonPositionCreator } from "./CommonPositionCreator.sol";
import { SparkExecuteActions } from "../../utils/executeActions/SparkExecuteActions.sol";
import { SparkTestHelper } from "../spark/SparkTestHelper.sol";
import { SparkSupply } from "../../../contracts/actions/spark/SparkSupply.sol";
import { SparkBorrow } from "../../../contracts/actions/spark/SparkBorrow.sol";
import { ISparkPool } from "../../../contracts/interfaces/protocols/spark/ISparkPool.sol";
import { SparkDataTypes } from "../../../contracts/interfaces/protocols/spark/SparkDataTypes.sol";
import { SmartWallet } from "../SmartWallet.sol";

/// @notice Contract for creating positions on Spark with default values for common parameters.
contract SparkPositionCreator is SparkExecuteActions, SparkTestHelper, CommonPositionCreator {
    ISparkPool pool;

    function setUp() public virtual override {
        pool = getSparkLendingPool(DEFAULT_SPARK_MARKET);
    }

    function createSparkPosition(PositionParams memory _params, SmartWallet _wallet) public {
        SparkDataTypes.ReserveData memory supplyData = pool.getReserveData(_params.collAddr);
        SparkDataTypes.ReserveData memory borrowData = pool.getReserveData(_params.debtAddr);

        SparkSupply.Params memory supplyParams = SparkSupply.Params({
            amount: _params.collAmount,
            from: _wallet.owner(),
            assetId: supplyData.id,
            enableAsColl: true,
            useDefaultMarket: true,
            useOnBehalf: false,
            market: address(0),
            onBehalf: address(0)
        });
        SparkBorrow.Params memory borrowParams = SparkBorrow.Params({
            amount: _params.debtAmount,
            to: _wallet.owner(),
            rateMode: 2,
            assetId: borrowData.id,
            useDefaultMarket: true,
            useOnBehalf: false,
            market: address(0),
            onBehalf: address(0)
        });

        executeSparkSupply(
            supplyParams, _params.collAddr, _wallet, false, address(new SparkSupply())
        );
        executeSparkBorrow(borrowParams, _wallet, false, address(new SparkBorrow()));
    }
}
