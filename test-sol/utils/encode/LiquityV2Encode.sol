// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { LiquityV2Open } from "../../../contracts/actions/liquityV2/trove/LiquityV2Open.sol";
import { LiquityV2Close } from "../../../contracts/actions/liquityV2/trove/LiquityV2Close.sol";
import { LiquityV2Supply } from "../../../contracts/actions/liquityV2/trove/LiquityV2Supply.sol";
import {
    LiquityV2Withdraw
} from "../../../contracts/actions/liquityV2/trove/LiquityV2Withdraw.sol";
import { LiquityV2Borrow } from "../../../contracts/actions/liquityV2/trove/LiquityV2Borrow.sol";
import { LiquityV2Payback } from "../../../contracts/actions/liquityV2/trove/LiquityV2Payback.sol";
import { LiquityV2Claim } from "../../../contracts/actions/liquityV2/trove/LiquityV2Claim.sol";
import { LiquityV2Adjust } from "../../../contracts/actions/liquityV2/trove/LiquityV2Adjust.sol";
import {
    LiquityV2AdjustZombieTrove
} from "../../../contracts/actions/liquityV2/trove/LiquityV2AdjustZombieTrove.sol";
import {
    LiquityV2AdjustInterestRate
} from "../../../contracts/actions/liquityV2/trove/LiquityV2AdjustInterestRate.sol";
import {
    LiquityV2SPDeposit
} from "../../../contracts/actions/liquityV2/stabilityPool/LiquityV2SPDeposit.sol";
import {
    LiquityV2SPWithdraw
} from "../../../contracts/actions/liquityV2/stabilityPool/LiquityV2SPWithdraw.sol";
import {
    LiquityV2SPClaimColl
} from "../../../contracts/actions/liquityV2/stabilityPool/LiquityV2SPClaimColl.sol";
import { LiquityV2RatioCheck } from "../../../contracts/actions/checkers/LiquityV2RatioCheck.sol";

library LiquityV2Encode {
    function payback(address _market, address _from, uint256 _troveId, uint256 _amount)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(
            LiquityV2Payback.Params({
                market: _market, from: _from, troveId: _troveId, amount: _amount
            })
        );
    }

    function supply(address _market, address _from, uint256 _troveId, uint256 _amount)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(
            LiquityV2Supply.Params({
                market: _market, from: _from, troveId: _troveId, amount: _amount
            })
        );
    }

    function withdraw(address _market, address _to, uint256 _troveId, uint256 _amount)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(
            LiquityV2Withdraw.Params({
                market: _market, to: _to, troveId: _troveId, amount: _amount
            })
        );
    }

    function spClaimColl(address _market, address _to) public pure returns (bytes memory params) {
        params = abi.encode(LiquityV2SPClaimColl.Params({ market: _market, to: _to }));
    }

    function spDeposit(
        address _market,
        address _from,
        address _boldGainTo,
        address _collGainTo,
        uint256 _amount,
        bool _doClaim
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            LiquityV2SPDeposit.Params({
                market: _market,
                from: _from,
                boldGainTo: _boldGainTo,
                collGainTo: _collGainTo,
                amount: _amount,
                doClaim: _doClaim
            })
        );
    }

    function spWithdraw(
        address _market,
        address _boldTo,
        address _collGainTo,
        uint256 _amount,
        bool _doClaim
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            LiquityV2SPWithdraw.Params({
                market: _market,
                boldTo: _boldTo,
                collGainTo: _collGainTo,
                amount: _amount,
                doClaim: _doClaim
            })
        );
    }

    function close(address _market, address _from, address _to, uint256 _troveId)
        public
        pure
        returns (bytes memory params)
    {
        params = abi.encode(
            LiquityV2Close.Params({ market: _market, from: _from, to: _to, troveId: _troveId })
        );
    }

    function open(
        address _market,
        address _from,
        address _to,
        address _interestBatchManager,
        uint256 _ownerIndex,
        uint256 _collAmount,
        uint256 _boldAmount,
        uint256 _upperHint,
        uint256 _lowerHint,
        uint256 _annualInterestRate,
        uint256 _maxUpfrontFee
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            LiquityV2Open.Params({
                market: _market,
                from: _from,
                to: _to,
                interestBatchManager: _interestBatchManager,
                ownerIndex: _ownerIndex,
                collAmount: _collAmount,
                boldAmount: _boldAmount,
                upperHint: _upperHint,
                lowerHint: _lowerHint,
                annualInterestRate: _annualInterestRate,
                maxUpfrontFee: _maxUpfrontFee
            })
        );
    }

    function adjust(
        address _market,
        address _from,
        address _to,
        uint256 _troveId,
        uint256 _collAmount,
        uint256 _debtAmount,
        uint256 _maxUpfrontFee,
        LiquityV2Adjust.CollActionType _collAction,
        LiquityV2Adjust.DebtActionType _debtAction
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            LiquityV2Adjust.Params({
                market: _market,
                from: _from,
                to: _to,
                troveId: _troveId,
                collAmount: _collAmount,
                debtAmount: _debtAmount,
                maxUpfrontFee: _maxUpfrontFee,
                collAction: _collAction,
                debtAction: _debtAction
            })
        );
    }

    function adjustZombieTrove(
        address _market,
        address _from,
        address _to,
        uint256 _troveId,
        uint256 _collAmount,
        uint256 _debtAmount,
        uint256 _upperHint,
        uint256 _lowerHint,
        uint256 _maxUpfrontFee,
        LiquityV2AdjustZombieTrove.CollActionType _collAction,
        LiquityV2AdjustZombieTrove.DebtActionType _debtAction
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            LiquityV2AdjustZombieTrove.Params({
                market: _market,
                from: _from,
                to: _to,
                troveId: _troveId,
                collAmount: _collAmount,
                debtAmount: _debtAmount,
                maxUpfrontFee: _maxUpfrontFee,
                upperHint: _upperHint,
                lowerHint: _lowerHint,
                collAction: _collAction,
                debtAction: _debtAction
            })
        );
    }

    function adjustInterestRate(
        address _market,
        uint256 _troveId,
        uint256 _newAnnualInterestRate,
        uint256 _upperHint,
        uint256 _lowerHint,
        uint256 _maxUpfrontFee
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            LiquityV2AdjustInterestRate.Params({
                market: _market,
                troveId: _troveId,
                newAnnualInterestRate: _newAnnualInterestRate,
                upperHint: _upperHint,
                lowerHint: _lowerHint,
                maxUpfrontFee: _maxUpfrontFee
            })
        );
    }

    function borrow(
        address _market,
        address _to,
        uint256 _troveId,
        uint256 _amount,
        uint256 _maxUpfrontFee
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            LiquityV2Borrow.Params({
                market: _market,
                to: _to,
                troveId: _troveId,
                amount: _amount,
                maxUpfrontFee: _maxUpfrontFee
            })
        );
    }

    function claim(address _market, address _to) public pure returns (bytes memory params) {
        params = abi.encode(LiquityV2Claim.Params({ market: _market, to: _to }));
    }

    function ratioCheck(
        address _market,
        uint256 _troveId,
        LiquityV2RatioCheck.RatioState _ratioState,
        uint256 _targetRatio
    ) public pure returns (bytes memory params) {
        params = abi.encode(
            LiquityV2RatioCheck.Params({
                market: _market,
                troveId: _troveId,
                ratioState: _ratioState,
                targetRatio: _targetRatio
            })
        );
    }
}
