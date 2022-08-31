// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../ActionBase.sol";
import "./helpers/CompV3Helper.sol";

/// @title Borrow base token from CompoundV3
contract CompV3Borrow is ActionBase, CompV3Helper {

    struct Params {
        uint256 amount;
        address to;
    }
    
    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.amount = _parseParamUint(params.amount, _paramMapping[0], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);

        (uint256 withdrawAmount, bytes memory logData) = _borrow(params.amount, params.to);
        emit ActionEvent("CompV3Borrow", logData);
        return bytes32(withdrawAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _borrow(params.amount, params.to);
        logger.logActionDirectEvent("CompV3Borrow", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice User borrows tokens from the Compound protocol
    /// @param _amount Amount of tokens to be borrowed
    /// @param _to The address we are sending the borrowed tokens to
    function _borrow(
        uint256 _amount,
        address _to
    ) internal returns (uint256, bytes memory) {
        address baseTokenAddress = IComet(COMET_ADDR).baseToken();
        IComet(COMET_ADDR).withdrawTo(_to,baseTokenAddress,_amount);
        bytes memory logData = abi.encode(baseTokenAddress, _amount, _to);
        return (_amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }

}