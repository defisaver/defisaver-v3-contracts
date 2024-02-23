// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { CommonPositionCreator } from "./CommonPositionCreator.sol";

import { AaveV3ExecuteActions } from "../../utils/executeActions/AaveV3ExecuteActions.sol";
import { AaveV3Supply } from "../../../contracts/actions/aaveV3/AaveV3Supply.sol";
import { AaveV3Borrow } from "../../../contracts/actions/aaveV3/AaveV3Borrow.sol";
import { AaveV3Helper } from "../../../contracts/actions/aaveV3/helpers/AaveV3Helper.sol";

import { IL2PoolV3 } from "../../../contracts/interfaces/aaveV3/IL2PoolV3.sol";
import { IAaveProtocolDataProvider } from "../../../contracts/interfaces/aaveV3/IAaveProtocolDataProvider.sol";
import { DataTypes } from "../../../contracts/interfaces/aaveV3/DataTypes.sol";

import { SmartWallet } from "../SmartWallet.sol";

/// @notice Contract for creating CDP on AaveV3 with default values for some common parameters
/// @dev If more complex setup is needed, use AaveV3ExecuteActions directly
contract AaveV3PositionCreator is AaveV3ExecuteActions, AaveV3Helper, CommonPositionCreator {

    IL2PoolV3 pool;
    IAaveProtocolDataProvider dataProvider;

    function setUp() public override virtual {
        pool = getLendingPool(DEFAULT_AAVE_MARKET);
        dataProvider = getDataProvider(DEFAULT_AAVE_MARKET);
    }

    function createAaveV3Position(
        PositionParams memory _params,
        SmartWallet _wallet
    ) public {
        DataTypes.ReserveData memory supplyData = pool.getReserveData(_params.collAddr);
        DataTypes.ReserveData memory borrowData = pool.getReserveData(_params.debtAddr);

        AaveV3Supply.Params memory supplyParams = AaveV3Supply.Params({
            amount: _params.collAmount,
            from: _wallet.owner(),
            assetId: supplyData.id,
            enableAsColl: true,
            useDefaultMarket: true,
            useOnBehalf: false,
            market: address(0),
            onBehalf: address(0)
        });
        AaveV3Borrow.Params memory borrowParams = AaveV3Borrow.Params({
            amount: _params.debtAmount,
            to: _wallet.owner(),
            rateMode: uint8(DataTypes.InterestRateMode.VARIABLE),
            assetId: borrowData.id,
            useDefaultMarket: true,
            useOnBehalf: false,
            market: address(0),
            onBehalf: address(0)
        });
        
        executeAaveV3Supply(supplyParams, _params.collAddr, _wallet, false, address(new AaveV3Supply()));        
        executeAaveV3Borrow(borrowParams, _wallet, false, address(new AaveV3Borrow()));
    }
}
