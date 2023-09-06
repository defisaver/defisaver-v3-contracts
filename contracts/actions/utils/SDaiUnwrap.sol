// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../ActionBase.sol";
import "../spark/helpers/SparkHelper.sol";
import "../../utils/TokenUtils.sol";
import "../../interfaces/spark/IsDAI.sol";
import "../../utils/helpers/UtilHelper.sol";


/// @title Action that redeems sDai for dai
contract SDaiUnwrap is ActionBase, SparkHelper, UtilHelper {
    using TokenUtils for address;

    /// @param amount - Amount of sDai to redeem
    /// @param from - Address from which the tokens will be pulled
    /// @param to - Address that will receive the dai
    struct Params {
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

        params.amount = _parseParamUint(params.amount, _paramMapping[0], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[1], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[2], _subData, _returnValues);

        (uint256 daiAmount, bytes memory logData) = _unwrap(params);
        emit ActionEvent("SDaiUnwrap", logData);
        return bytes32(daiAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _unwrap(params);
        logger.logActionDirectEvent("SDaiUnwrap", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _unwrap(Params memory _params) internal returns (uint256 daiAmount, bytes memory logData) {
        if (_params.from == address(0)) _params.from = address(this);

        uint256 sDaiBalance = SDAI_ADDR.getBalance(_params.from);
        if (_params.amount > sDaiBalance) _params.amount = sDaiBalance;

        daiAmount = DAI_ADDR.getBalance(_params.to);
        IsDAI(SDAI_ADDR).redeem(_params.amount, _params.to, _params.from);
        daiAmount = DAI_ADDR.getBalance(_params.to) - daiAmount;

        logData = abi.encode(
            _params, daiAmount
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}