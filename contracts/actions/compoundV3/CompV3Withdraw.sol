// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../ActionBase.sol";
import "./helpers/CompV3Helper.sol";

/// @title Withdraw a token from CompoundV3
contract CompV3Withdraw is ActionBase, CompV3Helper {

    /// @param market Main Comet proxy contract that is different for each compound market
    /// @param tokenAddr Address of the token to withdraw
    /// @param amount The quantity to withdraw
    /// @param from Address from which we are withdrawing the tokens from
    /// @param to Address where we are sending the withdrawn tokens
    struct Params {
        address market;
        address tokenAddr;
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
        params.tokenAddr = _parseParamAddr(params.tokenAddr, _paramMapping[1], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[2], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[3], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[4], _subData, _returnValues);

        (uint256 withdrawAmount, bytes memory logData) = _withdraw(params);
        emit ActionEvent("CompV3Withdraw", logData);
        return bytes32(withdrawAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _withdraw(params);
        logger.logActionDirectEvent("CompV3Withdraw", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Withdraws a token amount from compound
    /// @dev Send type(uint).max withdraws the whole balance of _from addr
    /// @dev If _to == address(0) we default to proxy address
    /// @param _params Withdraw input struct documented above
    function _withdraw(
        Params memory _params
    ) internal returns (uint256, bytes memory) {
        if (_params.to == address(0)) {
            _params.to = address(this);
        }

        // if _amount type(uint).max that means take out whole balance of _to address
        if (_params.amount == type(uint256).max) {
            if(_params.tokenAddr == IComet(_params.market).baseToken()) {
                _params.amount = IComet(_params.market).balanceOf(_params.from);
            } else {
                _params.amount = IComet(_params.market).collateralBalanceOf(_params.from, _params.tokenAddr);
            }
        }

        IComet(_params.market).withdrawFrom(_params.from, _params.to, _params.tokenAddr, _params.amount);

        bytes memory logData = abi.encode(_params);
        return (_params.amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
