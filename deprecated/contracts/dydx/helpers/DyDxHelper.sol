// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISoloMargin, Types, Account } from "../../../interfaces/protocols/dydx/ISoloMargin.sol";
import { MainnetDyDxAddresses } from "./MainnetDyDxAddresses.sol";

contract DyDxHelper is MainnetDyDxAddresses {
    ISoloMargin public constant soloMargin = ISoloMargin(SOLO_MARGIN_ADDR);

    error MarketIdNotFound();

    function getWeiBalance(address _user, uint256 _index, uint256 _marketId) public view returns (Types.Wei memory) {
        Types.Wei[] memory weiBalances;
        (,, weiBalances) = soloMargin.getAccountBalances(getAccount(_user, _index));

        return weiBalances[_marketId];
    }

    function getAccount(address _user, uint256 _index) public pure returns (Account.Info memory) {
        Account.Info memory account = Account.Info({ owner: _user, number: _index });

        return account;
    }

    function getMarketIdFromTokenAddress(address _token) public view returns (uint256 marketId) {
        uint256 numTokenIds = soloMargin.getNumMarkets();

        for (uint256 i = 0; i < numTokenIds; i++) {
            if (soloMargin.getMarketTokenAddress(i) == _token) {
                return i;
            }
        }

        // if we get this far no id has been found
        revert MarketIdNotFound();
    }
}
