// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../interfaces/ITrigger.sol";
import "../interfaces/aaveV3/IAaveV3Oracle.sol";
import "../interfaces/lido/IWStEth.sol";
import "../auth/AdminAuth.sol";
import "../DS/DSMath.sol";
import "../utils/TokenUtils.sol";
import "../actions/aaveV3/helpers/AaveV3RatioHelper.sol";

/// @title Trigger contract that verifies if current token price ratio is over/under the price ratio specified during subscription
contract AaveV3QuotePriceTrigger is ITrigger, AdminAuth, DSMath, AaveV3RatioHelper {
    using TokenUtils for address;

    enum PriceState {
        OVER,
        UNDER
    }

    /// @param baseTokenAddr address of the base token which is quoted
    /// @param quoteTokenAddr address of the quote token
    /// @param price price in quote token of the base token that represents the triggerable point
    /// @param state represents if we want the current price to be higher or lower than price param
    struct SubParams {
        address baseTokenAddr;
        address quoteTokenAddr;
        uint256 price;
        uint8 state;
    }

    IAaveV3Oracle public constant aaveOracleV3 =
        IAaveV3Oracle(AAVE_ORACLE_V3);

    /// @dev checks chainlink oracle for current prices and triggers if it's in a correct state
    function isTriggered(bytes memory, bytes memory _subData) public view override returns (bool) {
        SubParams memory triggerSubData = parseSubInputs(_subData);


        uint256 currPrice = getPrice(triggerSubData.baseTokenAddr, triggerSubData.quoteTokenAddr);

        if (PriceState(triggerSubData.state) == PriceState.OVER) {
            if (currPrice > triggerSubData.price) return true;
        }

        if (PriceState(triggerSubData.state) == PriceState.UNDER) {
            if (currPrice < triggerSubData.price) return true;
        }

        return false;
    }

    /// @dev helper function that returns latest base token price in quote tokens
    function getPrice(address _baseTokenAddr, address _quoteTokenAddr) public view returns (uint256 price) {
        address[] memory assets = new address[](2);
        assets[0] = _baseTokenAddr;
        assets[1] = _quoteTokenAddr;
        uint256[] memory assetPrices = aaveOracleV3.getAssetsPrices(
            assets
        );

        price = assetPrices[0] * 1e8 / assetPrices[1];
        
        if (_baseTokenAddr == TokenUtils.WSTETH_ADDR) {
            return wmul(uint256(price), IWStEth(TokenUtils.WSTETH_ADDR).stEthPerToken());
        }

        if (_quoteTokenAddr == TokenUtils.WSTETH_ADDR) {
            return wdiv(uint256(price), IWStEth(TokenUtils.WSTETH_ADDR).stEthPerToken());
        }

        return uint256(price);
    }
    
    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) {
    }
    
    function isChangeable() public pure override returns (bool){
        return false;
    }

    function parseSubInputs(bytes memory _callData)
        internal
        pure
        returns (SubParams memory params)
    {
        params = abi.decode(_callData, (SubParams));
    }
}
