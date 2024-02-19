// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { ExecuteActionsBase } from "./ExecuteActionsBase.sol";

import { AaveV3Supply } from "../../../contracts/actions/aaveV3/AaveV3Supply.sol";
import { AaveV3Borrow } from "../../../contracts/actions/aaveV3/AaveV3Borrow.sol";

contract AaveV3ExecuteActions is ExecuteActionsBase {
    
    function executeAaveV3Supply(
        AaveV3Supply.Params memory _params,
        address _supplyToken,
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

        giveBob(_supplyToken, _params.amount);
        approveAsBob(_supplyToken, walletAddr, _params.amount);

        executeByWallet(target, _calldata, 0);
    }

    function executeAaveV3Borrow(
        AaveV3Borrow.Params memory _params,
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

        executeByWallet(target, _calldata, 0);
    }
}
