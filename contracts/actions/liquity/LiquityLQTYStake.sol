// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "./helpers/LiquityHelper.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";

contract LiquityLQTYStake is ActionBase, LiquityHelper {
    using TokenUtils for address;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        (uint256 lqtyAmount, address from) = parseInputs(_callData);
        lqtyAmount = _parseParamUint(lqtyAmount, _paramMapping[0], _subData, _returnValues);
        from = _parseParamAddr(from, _paramMapping[1], _subData, _returnValues);

        lqtyAmount = _liquityLQTYStake(lqtyAmount, from);
        return bytes32(lqtyAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable virtual override {
        (uint256 lqtyAmount, address from) = parseInputs(_callData);

        _liquityLQTYStake(lqtyAmount, from);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Dont forget natspec
    function _liquityLQTYStake(uint256 _lqtyAmount, address _from) internal returns (uint256) {
        // TODO consider adding a destination address for gains
        if (_lqtyAmount == type(uint256).max) {
            _lqtyAmount = LQTYTokenAddr.getBalance(_from);
        }

        uint256 ethGain = LQTYStaking.getPendingETHGain(address(this));
        uint256 lusdGain = LQTYStaking.getPendingLUSDGain(address(this));

        LQTYTokenAddr.pullTokensIfNeeded(_from, _lqtyAmount);
        LQTYStaking.stake(_lqtyAmount);

        logger.Log(
            address(this),
            msg.sender,
            "LiquityLQTYStake",
            abi.encode(
                _lqtyAmount,
                _from,
                ethGain,
                lusdGain
            )
        );

        return _lqtyAmount;
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (uint256 lqtyAmount, address from) {
        lqtyAmount = abi.decode(_callData[0], (uint256));
        from = abi.decode(_callData[1], (address));
    }
}
