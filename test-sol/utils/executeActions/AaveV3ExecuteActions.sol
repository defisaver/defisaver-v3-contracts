// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { ExecuteActionsBase } from "./ExecuteActionsBase.sol";
import { SmartWallet } from "../SmartWallet.sol";

import { AaveV3Supply } from "../../../contracts/actions/aaveV3/AaveV3Supply.sol";
import { AaveV3Borrow } from "../../../contracts/actions/aaveV3/AaveV3Borrow.sol";

contract AaveV3ExecuteActions is ExecuteActionsBase {
    
    function executeAaveV3Supply(
        AaveV3Supply.Params memory _params,
        address _supplyToken,
        SmartWallet _wallet,
        bool _useAddressFromDfsRegistry,
        address _contractAddress
    ) public {
        bytes memory paramsCalldata = aaveV3SupplyEncode(
            _params.amount,
            _params.from,
            _params.assetId,
            _params.useDefaultMarket,
            _params.useOnBehalf,
            _params.market,
            _params.onBehalf
        );
        bytes memory _calldata = abi.encodeWithSelector(
            EXECUTE_ACTION_DIRECT_SELECTOR,
            paramsCalldata
        );
        address target = _useAddressFromDfsRegistry ? getAddr("AaveV3Supply") : _contractAddress;

        give(_supplyToken, _wallet.owner(), _params.amount);
        _wallet.ownerApprove(_supplyToken, _params.amount);
        _wallet.execute(target, _calldata, 0);
    }

    function executeAaveV3Borrow(
        AaveV3Borrow.Params memory _params,
        SmartWallet _wallet,
        bool _useAddressFromDfsRegistry,
        address _contractAddress
    ) public {
        bytes memory paramsCalldata = aaveV3BorrowEncode(
            _params.amount,
            _params.to,
            _params.rateMode,
            _params.assetId,
            _params.useDefaultMarket,
            _params.useOnBehalf,
            _params.market,
            _params.onBehalf
        );
        bytes memory _calldata = abi.encodeWithSelector(
            EXECUTE_ACTION_DIRECT_SELECTOR,
            paramsCalldata
        );
        address target = _useAddressFromDfsRegistry ? getAddr("AaveV3Borrow") : _contractAddress;

        _wallet.execute(target, _calldata, 0);
    }
}
