// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../ActionBase.sol";
import "./helpers/CompV3Helper.sol";
import "../../interfaces/IERC20.sol";
import "./helpers/MainnetCompV3Addresses.sol";

/// @title Withdraw a token from CompoundV3
contract CompV3Withdraw is ActionBase, CompV3Helper {

    struct Params {
        address to;
        address asset;
        uint256 amount;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.to = _parseParamAddr(params.to, _paramMapping[0], _subData, _returnValues);
        params.asset = _parseParamAddr(params.asset, _paramMapping[1], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[2], _subData, _returnValues);

        (uint256 withdrawAmount, bytes memory logData) = _withdraw(params.to, params.asset, params.amount);
        emit ActionEvent("CompV3Withdraw", logData);
        return bytes32(withdrawAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _withdraw(params.to, params.asset, params.amount);
        logger.logActionDirectEvent("CompV3Withdraw", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Withdraws a token amount from compound
    /// @dev Send type(uint).max withdraws the whole balance from Comet
    /// @param _to The recipient address
    /// @param _asset The asset to withdraw
    /// @param _amount The quantity to withdraw
    function _withdraw(
        address _to,
        address _asset,
        uint256 _amount
    ) internal returns (uint256, bytes memory) {

        IComet(COMET_ADDR).withdrawTo(_to, _asset, _amount);

        bytes memory logData = abi.encode(_to, _asset, _amount);
        return (_amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
