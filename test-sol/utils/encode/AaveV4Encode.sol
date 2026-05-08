// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { ISpoke } from "../../../contracts/interfaces/protocols/aaveV4/ISpoke.sol";
import {
    ITakerPositionManager
} from "../../../contracts/interfaces/protocols/aaveV4/ITakerPositionManager.sol";
import {
    IConfigPositionManager
} from "../../../contracts/interfaces/protocols/aaveV4/IConfigPositionManager.sol";
import { AaveV4Supply } from "../../../contracts/actions/aaveV4/AaveV4Supply.sol";
import { AaveV4Withdraw } from "../../../contracts/actions/aaveV4/AaveV4Withdraw.sol";
import { AaveV4Borrow } from "../../../contracts/actions/aaveV4/AaveV4Borrow.sol";
import { AaveV4Payback } from "../../../contracts/actions/aaveV4/AaveV4Payback.sol";
import {
    AaveV4CollateralSwitch
} from "../../../contracts/actions/aaveV4/AaveV4CollateralSwitch.sol";
import { AaveV4RefreshPremium } from "../../../contracts/actions/aaveV4/AaveV4RefreshPremium.sol";
import { AaveV4StoreRatio } from "../../../contracts/actions/aaveV4/AaveV4StoreRatio.sol";
import { AaveV4RatioCheck } from "../../../contracts/actions/checkers/AaveV4RatioCheck.sol";
import {
    AaveV4SetUserManagersWithSig
} from "../../../contracts/actions/aaveV4/AaveV4SetUserManagersWithSig.sol";
import {
    AaveV4DelegateBorrowWithSig
} from "../../../contracts/actions/aaveV4/AaveV4DelegateBorrowWithSig.sol";
import {
    AaveV4DelegateWithdrawWithSig
} from "../../../contracts/actions/aaveV4/AaveV4DelegateWithdrawWithSig.sol";
import {
    AaveV4DelegateSetUsingAsCollateralWithSig
} from "../../../contracts/actions/aaveV4/AaveV4DelegateSetUsingAsCollateralWithSig.sol";

library AaveV4Encode {
    function supply(
        address _spoke,
        address _onBehalf,
        address _from,
        uint256 _reserveId,
        uint256 _amount,
        bool _useAsCollateral
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            AaveV4Supply.Params({
                spoke: _spoke,
                onBehalf: _onBehalf,
                from: _from,
                reserveId: _reserveId,
                amount: _amount,
                useAsCollateral: _useAsCollateral
            })
        );
    }

    function withdraw(
        address _spoke,
        address _onBehalf,
        address _to,
        uint256 _reserveId,
        uint256 _amount
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            AaveV4Withdraw.Params({
                spoke: _spoke, onBehalf: _onBehalf, to: _to, reserveId: _reserveId, amount: _amount
            })
        );
    }

    function borrow(
        address _spoke,
        address _onBehalf,
        address _to,
        uint256 _reserveId,
        uint256 _amount
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            AaveV4Borrow.Params({
                spoke: _spoke, onBehalf: _onBehalf, to: _to, reserveId: _reserveId, amount: _amount
            })
        );
    }

    function payback(
        address _spoke,
        address _onBehalf,
        address _from,
        uint256 _reserveId,
        uint256 _amount
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            AaveV4Payback.Params({
                spoke: _spoke,
                onBehalf: _onBehalf,
                from: _from,
                reserveId: _reserveId,
                amount: _amount
            })
        );
    }

    function collateralSwitch(
        address _spoke,
        address _onBehalf,
        uint256 _reserveId,
        bool _useAsCollateral
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            AaveV4CollateralSwitch.Params({
                spoke: _spoke,
                onBehalf: _onBehalf,
                reserveId: _reserveId,
                useAsCollateral: _useAsCollateral
            })
        );
    }

    function refreshPremium(address _spoke, address _onBehalf, bool _refreshDynamicReserveConfig)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(
            AaveV4RefreshPremium.Params({
                spoke: _spoke,
                onBehalf: _onBehalf,
                refreshDynamicReserveConfig: _refreshDynamicReserveConfig
            })
        );
    }

    function storeRatio(address _spoke, address _user) public pure returns (bytes memory params) {
        params = abi.encode(AaveV4StoreRatio.Params({ spoke: _spoke, user: _user }));
    }

    function ratioCheck(uint8 _ratioState, uint256 _targetRatio, address _spoke, address _user)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(
            AaveV4RatioCheck.Params({
                ratioState: AaveV4RatioCheck.RatioState(_ratioState),
                targetRatio: _targetRatio,
                spoke: _spoke,
                user: _user
            })
        );
    }

    function setUserManagersWithSig(
        address _spoke,
        address _onBehalf,
        uint256 _nonce,
        uint256 _deadline,
        bytes memory _signature,
        ISpoke.PositionManagerUpdate[] memory _updates
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            AaveV4SetUserManagersWithSig.Params({
                spoke: _spoke,
                onBehalf: _onBehalf,
                nonce: _nonce,
                deadline: _deadline,
                signature: _signature,
                updates: _updates
            })
        );
    }

    function delegateBorrowWithSig(
        ITakerPositionManager.BorrowPermit memory _permit,
        bytes memory _signature
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            AaveV4DelegateBorrowWithSig.Params({ permit: _permit, signature: _signature })
        );
    }

    function delegateWithdrawWithSig(
        ITakerPositionManager.WithdrawPermit memory _permit,
        bytes memory _signature
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            AaveV4DelegateWithdrawWithSig.Params({ permit: _permit, signature: _signature })
        );
    }

    function delegateSetUsingAsCollateralWithSig(
        IConfigPositionManager.SetCanSetUsingAsCollateralPermissionPermit memory _permit,
        bytes memory _signature
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            AaveV4DelegateSetUsingAsCollateralWithSig.Params({
                permit: _permit, signature: _signature
            })
        );
    }
}
