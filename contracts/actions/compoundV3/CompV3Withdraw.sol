// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { CompV3Helper } from "./helpers/CompV3Helper.sol";
import { IComet } from "../../interfaces/compoundV3/IComet.sol";

/// @title Withdraw a token from CompoundV3.
contract CompV3Withdraw is ActionBase, CompV3Helper {

    /// @param market Main Comet proxy contract that is different for each compound market
    /// @param to Address where we are sending the withdrawn tokens
    /// @param asset Address of the token to withdraw
    /// @param amount The quantity to withdraw
    /// @param onBehalf Address from which we are withdrawing the tokens from
    struct Params {
        address market;
        address to;
        address asset;
        uint256 amount;
        address onBehalf;
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
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);
        params.asset = _parseParamAddr(params.asset, _paramMapping[2], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[3], _subData, _returnValues);

        // param was added later on, so we check if it's sent
        if (_paramMapping.length == 5) {
            params.onBehalf = _parseParamAddr(params.onBehalf, _paramMapping[4], _subData, _returnValues);
        }

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

    /// @notice Sending type(uint).max withdraws the whole balance of _from addr
    /// @dev If to == address(0) the action will revert
    /// @dev If onBehalf == address(0) the action will default to user's wallet
    /// @dev If onBehalf is not the user's wallet, the onBehalf address needs to allow the user's wallet
    /// @param _params Withdraw input struct documented above
    function _withdraw(
        Params memory _params
    ) internal returns (uint256, bytes memory) {
        require(_params.to != address(0), "Can't send tokens to 0x0");

        if (_params.onBehalf == address(0)) {
            _params.onBehalf = address(this);
        }

        // if _amount type(uint).max that means take out whole balance of _to address
        if (_params.amount == type(uint256).max) {
            if(_params.asset == IComet(_params.market).baseToken()) {
                _params.amount = IComet(_params.market).balanceOf(_params.onBehalf);
            } else {
                _params.amount = IComet(_params.market).collateralBalanceOf(_params.onBehalf, _params.asset);
            }
        }

        IComet(_params.market).withdrawFrom(_params.onBehalf, _params.to, _params.asset, _params.amount);

        bytes memory logData = abi.encode(_params);
        return (_params.amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
