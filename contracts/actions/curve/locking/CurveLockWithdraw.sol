// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../ActionBase.sol";
import "../helpers/CurveHelper.sol";
import "../../../utils/TokenUtils.sol";
import "../../../utils/SafeMath.sol";

contract CurveLockWithdraw is ActionBase, CurveHelper {
    using TokenUtils for address;
    using SafeMath for uint256;

    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        address receiver = parseInputs(_callData);
        receiver = _parseParamAddr(receiver, _paramMapping[0], _subData, _returnValues);
        
        uint256 witdhrawn = _curveLockWthdraw(receiver);
        return bytes32(witdhrawn);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable virtual override {
        address receiver = parseInputs(_callData);
        _curveLockWthdraw(receiver);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function _curveLockWthdraw(address _receiver) internal returns (uint256) {
        require(_receiver != address(0), "receiver cant be 0x0");

        uint256 balanceBefore = CrvTokenAddr.getBalance(address(this));
        VotingEscrow.withdraw();

        uint256 withdrawn = CrvTokenAddr.getBalance(address(this)).sub(balanceBefore);
        CrvTokenAddr.withdrawTokens(_receiver, withdrawn);

        logger.Log(
            address(this),
            msg.sender,
            "CurveLockWithdraw",
            abi.encode(
                _receiver,
                withdrawn
            )
        );

        return withdrawn;
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (address receiver) {
        receiver = abi.decode(_callData[0], (address));
    }
}