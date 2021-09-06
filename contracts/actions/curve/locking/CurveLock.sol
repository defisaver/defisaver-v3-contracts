// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../ActionBase.sol";
import "../helpers/CurveHelper.sol";
import "../../../utils/TokenUtils.sol";

contract CurveLock is ActionBase, CurveHelper {
    using TokenUtils for address;

    struct Params {
        address sender;     // address from which to pull Crv tokens
        uint256 amount;     // amount of tokens to lock
        uint256 unlockTime; // time of lock expiration
    }

    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.amount = _parseParamUint(params.amount, _paramMapping[0], _subData, _returnValues);
        
        uint256 locked = _curveLock(params);
        return bytes32(locked);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        _curveLock(params);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /// @notice Locks Crv tokens in VotingEscrow contract
    function _curveLock(Params memory _params) internal returns (uint256) {
        if (_params.amount == type(uint256).max) {
            _params.amount = CrvTokenAddr.getBalance(_params.sender);
        }

        CrvTokenAddr.pullTokensIfNeeded(_params.sender, _params.amount);
        VotingEscrow.create_lock(_params.amount, _params.unlockTime);

        logger.Log(
            address(this),
            msg.sender,
            "CurveLock",
            abi.encode(_params)
        );

        return _params.amount;
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (Params memory params) {
        params = abi.decode(_callData[0], (Params));
    }
}