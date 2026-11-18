// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { EulerV2Supply } from "../../../contracts/actions/eulerV2/EulerV2Supply.sol";
import { EulerV2Withdraw } from "../../../contracts/actions/eulerV2/EulerV2Withdraw.sol";
import { EulerV2Borrow } from "../../../contracts/actions/eulerV2/EulerV2Borrow.sol";
import { EulerV2Payback } from "../../../contracts/actions/eulerV2/EulerV2Payback.sol";
import {
    EulerV2CollateralSwitch
} from "../../../contracts/actions/eulerV2/EulerV2CollateralSwitch.sol";

library EulerV2Encode {
    function supply(
        address _vault,
        address _account,
        address _from,
        uint256 _amount,
        bool _enableAsColl
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            EulerV2Supply.Params({
                vault: _vault,
                account: _account,
                from: _from,
                amount: _amount,
                enableAsColl: _enableAsColl
            })
        );
    }

    function withdraw(address _vault, address _account, address _receiver, uint256 _amount)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(
            EulerV2Withdraw.Params({
                vault: _vault, account: _account, receiver: _receiver, amount: _amount
            })
        );
    }

    function payback(address _vault, address _account, address _from, uint256 _amount)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(
            EulerV2Payback.Params({
                vault: _vault, account: _account, from: _from, amount: _amount
            })
        );
    }

    function borrow(address _vault, address _account, address _receiver, uint256 _amount)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(
            EulerV2Borrow.Params({
                vault: _vault, account: _account, receiver: _receiver, amount: _amount
            })
        );
    }

    function collateralSwitch(address _vault, address _account, bool _enableAsColl)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(
            EulerV2CollateralSwitch.Params({
                vault: _vault, account: _account, enableAsColl: _enableAsColl
            })
        );
    }
}
