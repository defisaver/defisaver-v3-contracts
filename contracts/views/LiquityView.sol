// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

import "../actions/liquity/helpers/LiquityHelper.sol";
import "../utils/SafeMath.sol";

contract LiquityView is LiquityHelper {
    using SafeMath for uint256;

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
        bytes32 _action,
        uint256 _LUSDAmount,
        uint256 _collAmount
    ) external view returns (uint256 NICR) {
    
        uint256 debt;
        uint256 coll;

        //  LiquityOpen
        if (_action == 0x9784ddef75074931e96bf82802bd70756a92aaddb03af1f5972b971393e6b0b2) {
            debt = _LUSDAmount;
            if (!isRecoveryMode())
                debt.add(TroveManager.getBorrowingFeeWithDecay(_LUSDAmount));
            debt = BorrowerOperations.getCompositeDebt(debt);
            coll = _collAmount;
            return computeNICR(coll, debt);
        }

        ( debt, coll, , ) = TroveManager.getEntireDebtAndColl(_troveOwner);

        //  LiquityBorrow
        if (_action == 0x1b4a4a5559b4c263afdb368aaf6e2ac0f7d7d257f47350068d17a64c69b89599) {
            if (!isRecoveryMode())
                debt.add(TroveManager.getBorrowingFeeWithDecay(_LUSDAmount));
            return computeNICR(coll, debt.add(_LUSDAmount));
        }
        
        //  LiquityPayback
        if (_action == 0x0761723ec860d1b0b21e6b972427628f755d62f9d3ad7e3be1ded93346f4671f)
            return computeNICR(coll, debt.sub(_LUSDAmount));

        //  LiquitySupply
        if (_action == 0x7fe3a18199c1dabe02514e3e7b48a5676e21fa1fdcef93a01b179ed80906ca7b)
            return computeNICR(coll.add(_collAmount), debt);
        
        //  LiquityWithdraw
        if (_action == 0xeb0c03cd036f91ceecfca2444180fc0cda61a5cdc5cc3f5eed697d8f81e45ba5)
            return computeNICR(coll.sub(_collAmount), debt);
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