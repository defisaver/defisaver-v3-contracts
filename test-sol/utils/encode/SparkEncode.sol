// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { SparkSupply } from "../../../contracts/actions/spark/SparkSupply.sol";
import { SparkBorrow } from "../../../contracts/actions/spark/SparkBorrow.sol";
import { SparkSetEMode } from "../../../contracts/actions/spark/SparkSetEMode.sol";

library SparkEncode {
    function supply(
        uint256 _amount,
        address _from,
        uint16 _assetId,
        bool _enableAsColl,
        bool _useDefaultMarket,
        bool _useOnBehalf,
        address _market,
        address _onBehalf
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            SparkSupply.Params({
                amount: _amount,
                from: _from,
                assetId: _assetId,
                enableAsColl: _enableAsColl,
                useDefaultMarket: _useDefaultMarket,
                useOnBehalf: _useOnBehalf,
                market: _market,
                onBehalf: _onBehalf
            })
        );
    }

    function borrow(
        uint256 _amount,
        address _to,
        uint8 _rateMode,
        uint16 _assetId,
        bool _useDefaultMarket,
        bool _useOnBehalf,
        address _market,
        address _onBehalf
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            SparkBorrow.Params({
                amount: _amount,
                to: _to,
                rateMode: _rateMode,
                assetId: _assetId,
                useDefaultMarket: _useDefaultMarket,
                useOnBehalf: _useOnBehalf,
                market: _market,
                onBehalf: _onBehalf
            })
        );
    }

    function setEMode(uint8 _categoryId, bool _useDefaultMarket, address _market)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(
            SparkSetEMode.Params({
                categoryId: _categoryId, useDefaultMarket: _useDefaultMarket, market: _market
            })
        );
    }
}
