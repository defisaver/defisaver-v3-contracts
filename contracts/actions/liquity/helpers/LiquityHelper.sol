// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

import "../../../utils/SafeMath.sol";
import "../../../interfaces/liquity/ITroveManager.sol";
import "../../../interfaces/liquity/IBorrowerOperations.sol";
import "../../../interfaces/liquity/IPriceFeed.sol";


library LiquityHelper {

    using SafeMath for uint256;

    address constant public LUSDTokenAddr = 0x5f98805A4E8be255a32880FDeC7F6728C6568bA0;
    address constant public PriceFeedAddr = 0x4c517D4e2C851CA76d7eC94B805269Df0f2201De;
    address constant public BorrowerOperationsAddr = 0x24179CD81c9e782A4096035f7eC97fB8B783e007;
    address constant public TroveManagerAddr = 0xA39739EF8b0231DbFA0DcdA07d7e29faAbCf4bb2;
    address constant public SortedTrovesAddr = 0x8FdD3fbFEb32b28fb73555518f8b361bCeA741A6;
    address constant public HintHelpersAddr = 0xE84251b93D9524E0d2e621Ba7dc7cb3579F997C0;

    function isRecoveryMode() public view returns (bool) {
        uint256 price = IPriceFeed(PriceFeedAddr).lastGoodPrice();
        return ITroveManager(TroveManagerAddr).checkRecoveryMode(price);
    }
    
    function computeNICR(uint256 _coll, uint256 _debt) internal pure returns (uint256) {
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
                debt.add(ITroveManager(TroveManagerAddr).getBorrowingFeeWithDecay(_LUSDAmount));
            debt = IBorrowerOperations(BorrowerOperationsAddr).getCompositeDebt(debt);
            coll = _collAmount;
            return computeNICR(coll, debt);
        }

        ( debt, coll, , ) = ITroveManager(TroveManagerAddr).getEntireDebtAndColl(_troveOwner);

        //  LiquityBorrow
        if (_action == 0x1b4a4a5559b4c263afdb368aaf6e2ac0f7d7d257f47350068d17a64c69b89599) {
            if (!isRecoveryMode())
                debt.add(ITroveManager(TroveManagerAddr).getBorrowingFeeWithDecay(_LUSDAmount));
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
}