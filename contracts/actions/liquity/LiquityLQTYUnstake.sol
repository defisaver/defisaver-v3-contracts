// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "./helpers/LiquityHelper.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";

contract LiquityLQTYUnstake is ActionBase, LiquityHelper {
    using TokenUtils for address;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        (uint256 lqtyAmount, address to) = parseInputs(_callData);
        lqtyAmount = _parseParamUint(lqtyAmount, _paramMapping[0], _subData, _returnValues);
        to = _parseParamAddr(to, _paramMapping[1], _subData, _returnValues);

        lqtyAmount = _liquityLQTYUnstake(lqtyAmount, to);
        return bytes32(lqtyAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable virtual override {
        (uint256 lqtyAmount, address from) = parseInputs(_callData);

        _liquityLQTYUnstake(lqtyAmount, from);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Dont forget natspec
    function _liquityLQTYUnstake(uint256 _lqtyAmount, address _to) internal returns (uint256) {
        // TODO consider adding a destination address for gains
        uint256 ethGain = LQTYStaking.getPendingETHGain(address(this));
        uint256 lusdGain = LQTYStaking.getPendingLUSDGain(address(this));

        uint256 staked = LQTYStaking.stakes(address(this));
        _lqtyAmount = staked > _lqtyAmount ? _lqtyAmount : staked;

        LQTYStaking.unstake(_lqtyAmount);
        LQTYTokenAddr.withdrawTokens(_to, _lqtyAmount);

        logger.Log(
            address(this),
            msg.sender,
            "LiquityLQTYUnstake",
            abi.encode(
                _lqtyAmount,
                _to,
                ethGain,
                lusdGain
            )
        );

        return _lqtyAmount;
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (uint256 lqtyAmount, address to) {
        lqtyAmount = abi.decode(_callData[0], (uint256));
        to = abi.decode(_callData[1], (address));
    }
}
