// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ExecuteActionsBase } from "./ExecuteActionsBase.sol";
import { SmartWallet } from "../SmartWallet.sol";
import { SparkSupply } from "../../../contracts/actions/spark/SparkSupply.sol";
import { SparkBorrow } from "../../../contracts/actions/spark/SparkBorrow.sol";
import { SparkEncode } from "../encode/SparkEncode.sol";

contract SparkExecuteActions is ExecuteActionsBase {
    function executeSparkSupply(
        SparkSupply.Params memory _params,
        address _supplyToken,
        SmartWallet _wallet,
        bool _useAddressFromDfsRegistry,
        address _contractAddress
    ) public {
        bytes memory paramsCalldata = SparkEncode.supply(
            _params.amount,
            _params.from,
            _params.assetId,
            _params.enableAsColl,
            _params.useDefaultMarket,
            _params.useOnBehalf,
            _params.market,
            _params.onBehalf
        );
        bytes memory _calldata =
            abi.encodeWithSelector(EXECUTE_ACTION_DIRECT_SELECTOR, paramsCalldata);
        address target = _useAddressFromDfsRegistry ? getAddr("SparkSupply") : _contractAddress;

        give(_supplyToken, _wallet.owner(), _params.amount);
        _wallet.ownerApprove(_supplyToken, _params.amount);
        _wallet.execute(target, _calldata, 0);
    }

    function executeSparkBorrow(
        SparkBorrow.Params memory _params,
        SmartWallet _wallet,
        bool _useAddressFromDfsRegistry,
        address _contractAddress
    ) public {
        bytes memory paramsCalldata = SparkEncode.borrow(
            _params.amount,
            _params.to,
            _params.rateMode,
            _params.assetId,
            _params.useDefaultMarket,
            _params.useOnBehalf,
            _params.market,
            _params.onBehalf
        );
        bytes memory _calldata =
            abi.encodeWithSelector(EXECUTE_ACTION_DIRECT_SELECTOR, paramsCalldata);
        address target = _useAddressFromDfsRegistry ? getAddr("SparkBorrow") : _contractAddress;

        _wallet.execute(target, _calldata, 0);
    }
}
