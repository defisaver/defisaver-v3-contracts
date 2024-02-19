// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { CommonCdpCreator } from "./CommonCdpCreator.sol";

import { AaveV3ExecuteActions } from "../../utils/executeActions/AaveV3ExecuteActions.sol";
import { AaveV3Supply } from "../../../contracts/actions/aaveV3/AaveV3Supply.sol";
import { AaveV3Borrow } from "../../../contracts/actions/aaveV3/AaveV3Borrow.sol";
import { AaveV3Helper } from "../../../contracts/actions/aaveV3/helpers/AaveV3Helper.sol";

import { IL2PoolV3 } from "../../../contracts/interfaces/aaveV3/IL2PoolV3.sol";
import { IAaveProtocolDataProvider } from "../../../contracts/interfaces/aaveV3/IAaveProtocolDataProvider.sol";
import { DataTypes } from "../../../contracts/interfaces/aaveV3/DataTypes.sol";

/// @notice Contract for creating CDP on AaveV3 with default values for some common parameters
/// @dev If more complex setup is needed, use AaveV3ExecuteActions directly
contract AaveV3CdpCreator is AaveV3ExecuteActions, AaveV3Helper, CommonCdpCreator {

    IL2PoolV3 pool;
    IAaveProtocolDataProvider dataProvider;

    function setUp() public override virtual {
        pool = getLendingPool(DEFAULT_AAVE_MARKET);
        dataProvider = getDataProvider(DEFAULT_AAVE_MARKET);
    }

    function createAaveV3Cdp(
        CdpParams memory _params
    ) public {
        DataTypes.ReserveData memory supplyData = pool.getReserveData(_params.collAddr);
        DataTypes.ReserveData memory borrowData = pool.getReserveData(_params.debtAddr);

        AaveV3Supply.Params memory supplyParams = AaveV3Supply.Params({
            amount: _params.collAmount,
            from: bob,
            assetId: supplyData.id,
            useDefaultMarket: true,
            useOnBehalf: false,
            market: address(0),
            onBehalf: address(0)
        });
        AaveV3Borrow.Params memory borrowParams = AaveV3Borrow.Params({
            amount: _params.debtAmount,
            to: bob,
            rateMode: uint8(DataTypes.InterestRateMode.VARIABLE),
            assetId: borrowData.id,
            useDefaultMarket: true,
            useOnBehalf: false,
            market: address(0),
            onBehalf: address(0)
        });
        
        executeAaveV3Supply(supplyParams, _params.collAddr, false, address(new AaveV3Supply()));        
        executeAaveV3Borrow(borrowParams, false, address(new AaveV3Borrow()));
    }
}
