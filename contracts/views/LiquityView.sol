// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

import "../utils/TokenUtils.sol";
import "../actions/liquity/helpers/LiquityHelper.sol";
import "../utils/SafeMath.sol";

contract LiquityView is LiquityHelper {
    using TokenUtils for address;
    using SafeMath for uint256;

    enum LiquityActionIds {
        Open,
        Borrow,
        Payback,
        Supply,
        Withdraw
    }

    function isRecoveryMode() public view returns (bool) {
        uint256 price = PriceFeed.lastGoodPrice();
        return TroveManager.checkRecoveryMode(price);
    }
    
    function computeNICR(uint256 _coll, uint256 _debt) public pure returns (uint256) {
        if (_debt > 0) {
            return _coll.mul(1e20).div(_debt);
        }
        // Return the maximal value for uint256 if the Trove has a debt of 0. Represents "infinite" CR.
        else { // if (_debt == 0)
            return 2**256 - 1;
        }
    }

    /// @notice Predict the resulting nominal collateral ratio after a trove modifying action
    /// @param _troveOwner address of the trove owner, if the action specified is LiquityOpen this argument is ignored
    /// @param _action keccak256 hash of the action name
    function predictNICR(
        address _troveOwner,
        LiquityActionIds _action,
        address _from,
        uint256 _collAmount,
        uint256 _LUSDAmount
    ) external view returns (uint256 NICR) {
        //  LiquityOpen
        if (_action == LiquityActionIds.Open) {
            if (!isRecoveryMode())
                _LUSDAmount = _LUSDAmount.add(TroveManager.getBorrowingFeeWithDecay(_LUSDAmount));
            _LUSDAmount = BorrowerOperations.getCompositeDebt(_LUSDAmount);

            if (_collAmount == type(uint256).max)
                _collAmount = WETH_ADDR.getBalance(_from);
            
            return computeNICR(_collAmount, _LUSDAmount);
        }

        (uint256 debt, uint256 coll, , ) = TroveManager.getEntireDebtAndColl(_troveOwner);

        //  LiquityBorrow
        if (_action == LiquityActionIds.Borrow) {
            if (!isRecoveryMode())
                _LUSDAmount = _LUSDAmount.add(TroveManager.getBorrowingFeeWithDecay(_LUSDAmount));
            return computeNICR(coll, debt.add(_LUSDAmount));
        }
        
        //  LiquityPayback
        if (_action == LiquityActionIds.Payback) {
            if (_LUSDAmount == type(uint256).max)
                return computeNICR(coll, 0);
            return computeNICR(coll, debt.sub(_LUSDAmount));
        }

        //  LiquitySupply
        if (_action == LiquityActionIds.Supply) {
            if (_collAmount == type(uint256).max)
                _collAmount = WETH_ADDR.getBalance(_from);
            
            return computeNICR(coll.add(_collAmount), debt);
        }
        
        //  LiquityWithdraw
        if (_action == LiquityActionIds.Withdraw) {
            if (_LUSDAmount == type(uint256).max)
                return computeNICR(0, debt);
            return computeNICR(coll.sub(_collAmount), debt);
        }
            
    }

    function getApproxHint(uint _CR, uint _numTrials, uint _inputRandomSeed) external
        view
        returns (address hintAddress, uint diff, uint latestRandomSeed) {
            return HintHelpers.getApproxHint(_CR, _numTrials, _inputRandomSeed);
    }

    function findInsertPosition(uint256 _ICR, address _prevId, address _nextId) external view returns (address upperHint, address lowerHint) {
        return SortedTroves.findInsertPosition(_ICR, _prevId, _nextId);
    }
}