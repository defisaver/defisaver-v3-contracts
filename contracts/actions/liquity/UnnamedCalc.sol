// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../ActionBase.sol";
import "../../core/strategy/SubStorage.sol";
import "../../core/strategy/StrategyModel.sol";
import "../../actions/liquity/helpers/LiquityHelper.sol";

/// @title Special action to fetch Bond Id for the Liquity payback from CB strategy and to deactivate strategy
contract UnnamedCalc is ActionBase, LiquityHelper {
    
    struct Params {
        uint256 paybackAmount;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.paybackAmount = _parseParamUint(
            params.paybackAmount,
            _paramMapping[0],
            _subData,
            _returnValues
        );

        uint256 optimalPaybackAmount = getOptimalPaybackAmount(params);

        return(bytes32(optimalPaybackAmount));
    }

    function executeActionDirect(bytes memory _callData) public override payable {
        Params memory params = parseInputs(_callData);
        
        uint256 optimalPaybackAmount = getOptimalPaybackAmount(params);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function getOptimalPaybackAmount(Params memory _params) internal view returns (uint256 optimalPaybackAmount) {
        uint256 debt = TroveManager.getTroveDebt(address(this));
        if (debt - _params.paybackAmount > 2000e18){
            optimalPaybackAmount = _params.paybackAmount;
        } else {
            optimalPaybackAmount = debt - 2000e18;
        }
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
