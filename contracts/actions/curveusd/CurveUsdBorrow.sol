// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/CurveUsdHelper.sol";


/// @title Action that borrows crvUSD from user's wallet curveusd position
/// @dev debtAmount must be non-zero
contract CurveUsdBorrow is ActionBase, CurveUsdHelper {
    using TokenUtils for address;

    error ZeroAmountBorrowed();

    /// @param controllerAddress Address of the curveusd market controller
    /// @param to Address that will receive the borrowed crvUSD, will default to user's wallet
    /// @param debtAmount Amount of crvUSD to borrow (does not support uint.max)
    struct Params {
        address controllerAddress;
        address to;
        uint256 debtAmount;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.controllerAddress = _parseParamAddr(params.controllerAddress, _paramMapping[0], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);
        params.debtAmount = _parseParamUint(params.debtAmount, _paramMapping[2], _subData, _returnValues);

        (uint256 generatedAmount, bytes memory logData) = _curveUsdBorrow(params);
        emit ActionEvent("CurveUsdBorrow", logData);
        return bytes32(generatedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _curveUsdBorrow(params);
        logger.logActionDirectEvent("CurveUsdBorrow", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _curveUsdBorrow(Params memory _params) internal returns (uint256, bytes memory) {
        /// @dev see ICrvUsdController natspec
        if (_params.debtAmount == 0) revert ZeroAmountBorrowed();
        
        if (!isControllerValid(_params.controllerAddress)) revert CurveUsdInvalidController();

        ICrvUsdController(_params.controllerAddress).borrow_more(0, _params.debtAmount);

        CRVUSD_TOKEN_ADDR.withdrawTokens(_params.to, _params.debtAmount);

        return (
            _params.debtAmount,
            abi.encode(_params)
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}