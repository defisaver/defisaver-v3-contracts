// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ITrigger } from "../interfaces/core/ITrigger.sol";
import { ISparkV3Oracle } from "../interfaces/protocols/spark/ISparkV3Oracle.sol";
import { AdminAuth } from "../auth/AdminAuth.sol";
import { DSMath } from "../_vendor/DS/DSMath.sol";
import { SparkRatioHelper } from "../actions/spark/helpers/SparkRatioHelper.sol";

/// @title Trigger contract that verifies if current token price ratio is outside of given range specified during subscription
/// @dev Uses the Spark V3 oracle, which provides asset prices in a shared base currency.
/// @notice The contract computes the base/quote ratio by dividing the oracle prices of the two tokens.
/// @notice The trigger expects the lowerPrice and upperPrice inputs to be scaled by 1e8.
/// @notice It is possible to check only one side of the range by setting the other side price to 0.
contract SparkQuotePriceRangeTrigger is ITrigger, AdminAuth, DSMath, SparkRatioHelper {
    /// @param baseTokenAddr address of the base token which is quoted
    /// @param quoteTokenAddr address of the quote token
    /// @param lowerPrice lower price of the base token in terms of the quote token that represents the triggerable point.
    /// @param upperPrice upper price of the base token in terms of the quote token that represents the triggerable point.
    struct SubParams {
        address baseTokenAddr;
        address quoteTokenAddr;
        uint256 lowerPrice;
        uint256 upperPrice;
    }

    ISparkV3Oracle public constant sparkOracleV3 = ISparkV3Oracle(SPARK_ORACLE_V3);

    /// @notice Checks Spark V3 oracle for current prices and triggers if it's in a correct state
    function isTriggered(bytes memory, bytes memory _subData) public view override returns (bool) {
        SubParams memory triggerSubData = parseSubInputs(_subData);

        uint256 currPrice = getPrice(triggerSubData.baseTokenAddr, triggerSubData.quoteTokenAddr);

        /// @dev Only check `lowerPrice` if `upperPrice` is not set.
        if (triggerSubData.upperPrice == 0) return currPrice < triggerSubData.lowerPrice;

        return currPrice < triggerSubData.lowerPrice || currPrice > triggerSubData.upperPrice;
    }

    /// @dev helper function that returns latest base token price in quote tokens
    function getPrice(address _baseTokenAddr, address _quoteTokenAddr)
        public
        view
        returns (uint256 price)
    {
        address[] memory assets = new address[](2);
        assets[0] = _baseTokenAddr;
        assets[1] = _quoteTokenAddr;
        uint256[] memory assetPrices = sparkOracleV3.getAssetsPrices(assets);

        price = assetPrices[0] * 1e8 / assetPrices[1];

        return uint256(price);
    }

    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) { }

    function isChangeable() public pure override returns (bool) {
        return false;
    }

    function parseSubInputs(bytes memory _callData) public pure returns (SubParams memory params) {
        params = abi.decode(_callData, (SubParams));
    }
}
