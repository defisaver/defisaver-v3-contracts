// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IPriceFeed } from "../interfaces/liquityV2/IPriceFeed.sol";

contract MockLiquityV2PriceFeed is IPriceFeed {
    uint256 private PRICE;

    function setPrice(uint256 _price) external {
        PRICE = _price;
    }

    function getPrice() external view returns (uint256 _price) {
        return PRICE;
    }

    function fetchPrice() external view returns (uint256, bool) {
        return (PRICE, false);
    }

    function fetchRedemptionPrice() external view returns (uint256, bool) {
        return (PRICE, false);
    }

    function lastGoodPrice() external view returns (uint256) {
        return PRICE;
    }

    function getEthUsdStalenessThreshold() external pure returns (uint256) {
        return 0;
    }

    function setAddresses(address _borrowerOperationsAddress) external {
        // do nothing
    }
}
