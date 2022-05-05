// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../actions/dydx/helpers/DyDxHelper.sol";

contract DyDxView is DyDxHelper {
    function getSupplyBalance(address _user, address _tokenAddr) public view returns (uint) {
        uint marketId = getMarketIdFromTokenAddress(_tokenAddr);

        Types.Wei memory userBalance = getWeiBalance(_user, 0, marketId);

        return userBalance.value;
    }
}