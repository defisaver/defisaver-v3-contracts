// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { EulerV2ExecuteActions } from "../../utils/executeActions/EulerV2ExecuteActions.sol";
import { EulerV2Supply } from "../../../contracts/actions/eulerV2/EulerV2Supply.sol";
import { EulerV2Borrow } from "../../../contracts/actions/eulerV2/EulerV2Borrow.sol";
import { EulerV2Helper } from "../../../contracts/actions/eulerV2/helpers/EulerV2Helper.sol";

import { CommonPositionCreator } from "./CommonPositionCreator.sol";
import { SmartWallet } from "../SmartWallet.sol";

contract EulerV2PositionCreator is EulerV2ExecuteActions, CommonPositionCreator {

    function setUp() public override virtual {}

    function createEulerV2Position(
        PositionParams memory _params,
        SmartWallet _wallet,
        address eulerAccount
    ) public {
        address account = eulerAccount == address(0) ? _wallet.walletAddr() : eulerAccount;

        EulerV2Supply.Params memory supplyParams = EulerV2Supply.Params({
            vault: _params.collAddr,
            account: account,
            from: _wallet.owner(),
            amount: _params.collAmount,
            enableAsColl: true
        });

        EulerV2Borrow.Params memory borrowParams = EulerV2Borrow.Params({
            vault: _params.debtAddr,
            account: account,
            receiver: _wallet.owner(),
            amount: _params.debtAmount
        });

        executeEulerV2Supply(supplyParams, _wallet, false, address(new EulerV2Supply()));
        executeEulerV2Borrow(borrowParams, _wallet, false, address(new EulerV2Borrow()));
    }
}
