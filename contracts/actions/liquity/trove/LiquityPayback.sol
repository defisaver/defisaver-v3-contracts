// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../helpers/LiquityHelper.sol";
import "../../../utils/TokenUtils.sol";
import "../../ActionBase.sol";

contract LiquityPayback is ActionBase, LiquityHelper {
    using TokenUtils for address;

    struct Params {
        uint256 lusdAmount; // Amount of LUSD tokens to repay
        address from;       // Address where to pull the tokens from
        address upperHint;
        address lowerHint;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.lusdAmount = _parseParamUint(
            params.lusdAmount,
            _paramMapping[0],
            _subData,
            _returnValues
        );
        params.from = _parseParamAddr(params.from, _paramMapping[1], _subData, _returnValues);

        (uint256 repayAmount, bytes memory logData) = _liquityPayback(params);
        emit ActionEvent("LiquityPayback", logData);
        return bytes32(repayAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _liquityPayback(params);
        logger.logActionDirectEvent("LiquityPayback", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Repays LUSD tokens to the trove
    function _liquityPayback(Params memory _params) internal returns (uint256, bytes memory) {
        uint256 lusdAmountToPayback = LUSD_TOKEN_ADDRESS.pullTokensIfNeeded(_params.from, _params.lusdAmount);

        uint256 debt = TroveManager.getTroveDebt(address(this));
        
        if (debt < lusdAmountToPayback + MIN_DEBT && _params.lusdAmount == type(uint256).max){
            lusdAmountToPayback = debt - MIN_DEBT;
        }

        BorrowerOperations.repayLUSD(lusdAmountToPayback, _params.upperHint, _params.lowerHint);

        bytes memory logData = abi.encode(lusdAmountToPayback, _params.from);
        return (lusdAmountToPayback, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
