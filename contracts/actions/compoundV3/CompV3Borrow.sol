// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../ActionBase.sol";
import "./helpers/CompV3Helper.sol";

/// @title Borrow base token from CompoundV3
contract CompV3Borrow is ActionBase, CompV3Helper {

    /// @param market Main Comet proxy contract that is different for each compound market
    /// @param amount Amount of tokens to be borrowed
    /// @param from The address from where we are borrowing the tokens from
    /// @param to The address we are sending the borrowed tokens to
    struct Params {
        address market;
        uint256 amount;
        address from;
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

        params.market = _parseParamAddr(params.market, _paramMapping[0], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[1], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[2], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[3], _subData, _returnValues);

        (uint256 withdrawAmount, bytes memory logData) = _borrow(params);
        emit ActionEvent("CompV3Borrow", logData);
        return bytes32(withdrawAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _borrow(params);
        logger.logActionDirectEvent("CompV3Borrow", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice User borrows tokens from the Compound protocol
    /// @dev If _to == address(0) we default to proxy address
    /// @param _params Borrow input struct documented above
    function _borrow(Params memory _params) internal returns (uint256, bytes memory) {
        if (_params.to == address(0)) {
            _params.to = address(this);
        }

        address baseTokenAddress = IComet(_params.market).baseToken();

        IComet(_params.market).withdrawFrom(_params.from, _params.to, baseTokenAddress, _params.amount);

        bytes memory logData = abi.encode(_params);
        return (_params.amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }

}