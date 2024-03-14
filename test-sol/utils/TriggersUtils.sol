// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import { BalanceAndAllowanceTrigger } from "../../contracts/triggers/BalanceAndAllowanceTrigger.sol";

contract TriggersUtils {

    function balanceAndAllowanceEncode(
        address _from,
        address _to,
        address _token,
        uint256 _amount,
        bool _useMaxAvailableBalance
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            BalanceAndAllowanceTrigger.SubParams({
                from: _from,
                to: _to,
                token: _token,
                amount: _amount,
                useMaxAvailableBalance: _useMaxAvailableBalance
            })
        );
    }
}
