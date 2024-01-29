// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../ActionBase.sol";
import "../../../utils/TokenUtils.sol";
import "./helpers/MorphoAaveV3Helper.sol";

/// @title Payback a token to Morpho AaveV3
contract MorphoAaveV3Payback is ActionBase, MorphoAaveV3Helper {
    using TokenUtils for address;

    /// @param emodeId Type of emode we are entering in, each one is different deployment on Morpho
    /// @param tokenAddr The address of the token to be paid back
    /// @param amount Amount of tokens to be paid back
    /// @param from Where are we pulling the payback tokens amount from
    /// @param onBehalf For what user we are paying back the debt, defaults to user's wallet
    struct Params {
        uint256 emodeId;
        address tokenAddr;
        uint256 amount;
        address from;
        address onBehalf;
    }

    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.emodeId = _parseParamUint(params.emodeId, _paramMapping[0], _subData, _returnValues);
        params.tokenAddr = _parseParamAddr(
            params.tokenAddr,
            _paramMapping[1],
            _subData,
            _returnValues
        );
        params.amount = _parseParamUint(params.amount, _paramMapping[2], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[3], _subData, _returnValues);
        params.onBehalf = _parseParamAddr(
            params.onBehalf,
            _paramMapping[4],
            _subData,
            _returnValues
        );

        (uint256 amount, bytes memory logData) = _repay(params);
        emit ActionEvent("MorphoAaveV3Payback", logData);
        return bytes32(amount);
    }

    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _repay(params);
        logger.logActionDirectEvent("MorphoAaveV3Payback", logData);
    }

    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _repay(Params memory _params) internal returns (uint256, bytes memory) {
        address morphoAddress = getMorphoAddressByEmode(_params.emodeId);

        // default to onBehalf of user's wallet
        if (_params.onBehalf == address(0)) {
            _params.onBehalf = address(this);
        }

        uint256 totalDebt = IMorphoAaveV3(morphoAddress).borrowBalance(
            _params.tokenAddr,
            _params.onBehalf
        );

        // if amount bigger than max user debt, pull and repay just the max debt
        if (_params.amount > totalDebt) _params.amount = totalDebt;

        _params.amount = _params.tokenAddr.pullTokensIfNeeded(_params.from, _params.amount);
        _params.tokenAddr.approveToken(morphoAddress, _params.amount);

        IMorphoAaveV3(morphoAddress).repay(_params.tokenAddr, _params.amount, _params.onBehalf);

        bytes memory logData = abi.encode(_params);
        return (_params.amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
