// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IEVault } from "../../../contracts/interfaces/eulerV2/IEVault.sol";
import { EulerV2Supply } from "../../../contracts/actions/eulerV2/EulerV2Supply.sol";
import { EulerV2Borrow } from "../../../contracts/actions/eulerV2/EulerV2Borrow.sol";

import { ExecuteActionsBase } from "./ExecuteActionsBase.sol";
import { SmartWallet } from "../SmartWallet.sol";

contract EulerV2ExecuteActions is ExecuteActionsBase {

    function executeEulerV2Supply(
        EulerV2Supply.Params memory _params,
        SmartWallet _wallet,
        bool _useAddressFromDfsRegistry,
        address _contractAddress
    ) public {
        bytes memory paramsCalldata = eulerV2SupplyEncode(
            _params.vault,
            _params.account,
            _params.from,
            _params.amount,
            _params.enableAsColl
        );
        bytes memory _calldata = abi.encodeWithSelector(
            EXECUTE_ACTION_DIRECT_SELECTOR,
            paramsCalldata
        );
        address target = _useAddressFromDfsRegistry ? getAddr("EulerV2Supply") : _contractAddress;

        address assetToken = IEVault(_params.vault).asset();

        give(assetToken, _wallet.owner(), _params.amount);
        _wallet.ownerApprove(assetToken, _params.amount);
        _wallet.execute(target, _calldata, 0);
    }

    function executeEulerV2Borrow(
        EulerV2Borrow.Params memory _params,
        SmartWallet _wallet,
        bool _useAddressFromDfsRegistry,
        address _contractAddress
    ) public {
        bytes memory paramsCalldata = eulerV2BorrowEncode(
            _params.vault,
            _params.account,
            _params.receiver,
            _params.amount
        );
        bytes memory _calldata = abi.encodeWithSelector(
            EXECUTE_ACTION_DIRECT_SELECTOR,
            paramsCalldata
        );
        address target = _useAddressFromDfsRegistry ? getAddr("EulerV2Borrow") : _contractAddress;

        _wallet.execute(target, _calldata, 0);
    }
}
