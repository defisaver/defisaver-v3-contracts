// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../../../interfaces/dydx/ISoloMargin.sol";

contract DyDxHelper {
    ISoloMargin public constant soloMargin =
        ISoloMargin(0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e);

    function getWeiBalance(
        address _user,
        uint256 _index,
        uint256 _marketId
    ) public view returns (Types.Wei memory) {
        Types.Wei[] memory weiBalances;
        (, , weiBalances) = soloMargin.getAccountBalances(getAccount(_user, _index));

        return weiBalances[_marketId];
    }

    function getAccount(address _user, uint256 _index) public pure returns (Account.Info memory) {
        Account.Info memory account = Account.Info({owner: _user, number: _index});

        return account;
    }

    function getMarketIdFromTokenAddress(address _token)
        public
        view
        returns (uint256 marketId)
    {
        uint256 numTokenIds = soloMargin.getNumMarkets();

        for (uint256 i = 0; i < numTokenIds; i++) {
            if (soloMargin.getMarketTokenAddress(i) == _token) {
                return i;
            }
        }

        // if we get this far no id has been found
        revert("No DyDx market id found for token");
    }
}
