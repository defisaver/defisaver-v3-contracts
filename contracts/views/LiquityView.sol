// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../utils/TokenUtils.sol";
import "../actions/liquity/helpers/LiquityHelper.sol";
import "../utils/SafeMath.sol";

contract LiquityView is LiquityHelper {
    using TokenUtils for address;
    using SafeMath for uint256;

    enum LiquityActionId {Open, Borrow, Payback, Supply, Withdraw}

    function isRecoveryMode() public view returns (bool) {
        uint256 price = PriceFeed.lastGoodPrice();
        return TroveManager.checkRecoveryMode(price);
    }

    function computeNICR(uint256 _coll, uint256 _debt) public pure returns (uint256) {
        if (_debt > 0) {
            return _coll.mul(1e20).div(_debt);
        }
        // Return the maximal value for uint256 if the Trove has a debt of 0. Represents "infinite" CR.
        else {
            // if (_debt == 0)
            return 2**256 - 1;
        }
    }

    /// @notice Predict the resulting nominal collateral ratio after a trove modifying action
    /// @param _troveOwner Address of the trove owner, if the action specified is LiquityOpen this argument is ignored
    /// @param _action LiquityActionIds
    function predictNICR(
        address _troveOwner,
        LiquityActionId _action,
        address _from,
        uint256 _collAmount,
        uint256 _lusdAmount
    ) external view returns (uint256 NICR) {
        //  LiquityOpen
        if (_action == LiquityActionId.Open) {
            if (!isRecoveryMode())
                _lusdAmount = _lusdAmount.add(TroveManager.getBorrowingFeeWithDecay(_lusdAmount));
            _lusdAmount = BorrowerOperations.getCompositeDebt(_lusdAmount);

            if (_collAmount == type(uint256).max)
                _collAmount = TokenUtils.WETH_ADDR.getBalance(_from);

            return computeNICR(_collAmount, _lusdAmount);
        }

        (uint256 debt, uint256 coll, , ) = TroveManager.getEntireDebtAndColl(_troveOwner);

        //  LiquityBorrow
        if (_action == LiquityActionId.Borrow) {
            if (!isRecoveryMode())
                _lusdAmount = _lusdAmount.add(TroveManager.getBorrowingFeeWithDecay(_lusdAmount));
            return computeNICR(coll, debt.add(_lusdAmount));
        }

        //  LiquityPayback
        if (_action == LiquityActionId.Payback) {
            return computeNICR(coll, debt.sub(_lusdAmount));
        }

        //  LiquitySupply
        if (_action == LiquityActionId.Supply) {
            if (_collAmount == type(uint256).max)
                _collAmount = TokenUtils.WETH_ADDR.getBalance(_from);

            return computeNICR(coll.add(_collAmount), debt);
        }

        //  LiquityWithdraw
        if (_action == LiquityActionId.Withdraw) {
            return computeNICR(coll.sub(_collAmount), debt);
        }
    }

    function getApproxHint(
        uint256 _CR,
        uint256 _numTrials,
        uint256 _inputRandomSeed
    )
        external
        view
        returns (
            address hintAddress,
            uint256 diff,
            uint256 latestRandomSeed
        )
    {
        return HintHelpers.getApproxHint(_CR, _numTrials, _inputRandomSeed);
    }

    function findInsertPosition(
        uint256 _ICR,
        address _prevId,
        address _nextId
    ) external view returns (address upperHint, address lowerHint) {
        return SortedTroves.findInsertPosition(_ICR, _prevId, _nextId);
    }

    function getTroveInfo(address _troveOwner)
        external
        view
        returns (
            uint256 troveStatus,
            uint256 collAmount,
            uint256 debtAmount,
            uint256 collPrice,
            uint256 TCRatio,
            bool recoveryMode
        )
    {
        troveStatus = TroveManager.getTroveStatus(_troveOwner);
        collAmount = TroveManager.getTroveColl(_troveOwner);
        debtAmount = TroveManager.getTroveDebt(_troveOwner);
        collPrice = PriceFeed.lastGoodPrice();
        TCRatio = TroveManager.getTCR(collPrice);
        recoveryMode = TroveManager.checkRecoveryMode(collPrice);
    }

    function getInsertPosition(
        uint256 _collAmount,
        uint256 _debtAmount,
        uint256 _numTrials,
        uint256 _inputRandomSeed
    ) external view returns (address upperHint, address lowerHint) {
        uint256 NICR = _collAmount.mul(1e20).div(_debtAmount);
        (address hintAddress, , ) = HintHelpers.getApproxHint(NICR, _numTrials, _inputRandomSeed);
        (upperHint, lowerHint) = SortedTroves.findInsertPosition(NICR, hintAddress, hintAddress);
    }

    function getRedemptionHints(
        uint _LUSDamount, 
        uint _price,
        uint _maxIterations
    )
        external
        view
        returns (
        address firstRedemptionHint,
        uint partialRedemptionHintNICR,
        uint truncatedLUSDamount
    ) {
        return HintHelpers.getRedemptionHints(_LUSDamount, _price, _maxIterations);
    }
    
    function getStakeInfo(address _user) external view returns (uint256 stake, uint256 ethGain, uint256 lusdGain) {
        stake = LQTYStaking.stakes(_user);
        ethGain = LQTYStaking.getPendingETHGain(_user);
        lusdGain = LQTYStaking.getPendingLUSDGain(_user);
    }
    
    function getDepositorInfo(address _depositor) external view returns(uint256 compoundedLUSD, uint256 ethGain, uint256 lqtyGain) {
        compoundedLUSD = StabilityPool.getCompoundedLUSDDeposit(_depositor);
        ethGain = StabilityPool.getDepositorETHGain(_depositor);
        lqtyGain = StabilityPool.getDepositorLQTYGain(_depositor);
    }

    /// @notice Returns the debt in front of the users trove in the sorted list
    /// @param _of Address of the trove owner
    /// @param _acc Accumulated sum used in subsequent calls, 0 for first call
    /// @param _iterations Maximum number of troves to traverse
    /// @return next Trove owner address to be used in the subsequent call, address(0) at the end of list
    /// @return debt Accumulated debt to be used in the subsequent call
    function getDebtInFront(address _of, uint256 _acc, uint256 _iterations) external view returns (address next, uint256 debt) {
        next = _of;
        debt = _acc;
        for (uint256 i = 0; i < _iterations && next != address(0); i++) {
            next = SortedTroves.getNext(next);
            debt = debt.add(TroveManager.getTroveDebt(next));
        }
    }
}
