// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../ActionBase.sol";
import "../spark/helpers/SparkHelper.sol";
import "../../utils/TokenUtils.sol";
import "../../interfaces/spark/IsDAI.sol";
import "../../utils/helpers/UtilHelper.sol";

/// @title Action that deposits dai into sDai
contract SDaiWrap is ActionBase, SparkHelper, UtilHelper {
    using TokenUtils for address;

    /// @param amount - Amount of dai to deposit
    /// @param from - Address from which the tokens will be pulled
    /// @param to - Address that will receive the sDai
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

        (uint256 shares, bytes memory logData) = _wrap(params);
        emit ActionEvent("SDaiWrap", logData);
        return bytes32(shares);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _wrap(params);
        logger.logActionDirectEvent("SDaiWrap", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _wrap(Params memory _params) internal returns (uint256 shares, bytes memory logData) {
        _params.amount = DAI_ADDR.pullTokensIfNeeded(_params.from, _params.amount);
        shares = SDAI_ADDR.getBalance(_params.to);

        DAI_ADDR.approveToken(SDAI_ADDR, _params.amount);
        IsDAI(SDAI_ADDR).deposit(_params.amount, _params.to);

        shares = SDAI_ADDR.getBalance(_params.to) - shares;
        logData = abi.encode(
            _params, shares
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}