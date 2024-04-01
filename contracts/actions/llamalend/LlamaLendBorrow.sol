// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/LlamaLendHelper.sol";


/// @title Action that borrows asset from user's wallet llamalend position
/// @dev debtAmount must be non-zero
contract LlamaLendBorrow is ActionBase, LlamaLendHelper {
    using TokenUtils for address;

    error ZeroAmountBorrowed();

    /// @param controllerAddress Address of the llamalend market controller
    /// @param to Address that will receive the borrowed asset, will default to user's wallet
    /// @param debtAmount Amount of debt asset to borrow (does not support uint.max)
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

        (uint256 generatedAmount, bytes memory logData) = _llamaLendBorrow(params);
        emit ActionEvent("LlamaLendBorrow", logData);
        return bytes32(generatedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _llamaLendBorrow(params);
        logger.logActionDirectEvent("LlamaLendBorrow", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _llamaLendBorrow(Params memory _params) internal returns (uint256, bytes memory) {
        if (_params.debtAmount == 0) revert ZeroAmountBorrowed();

        ILlamaLendController(_params.controllerAddress).borrow_more(0, _params.debtAmount);

        address debtAsset = ILlamaLendController(_params.controllerAddress).borrowed_token();

        debtAsset.withdrawTokens(_params.to, _params.debtAmount);

        return (
            _params.debtAmount,
            abi.encode(_params)
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}