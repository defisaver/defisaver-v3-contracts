// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "./helpers/LiquityHelper.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";

contract LiquityUnstake is ActionBase, LiquityHelper {
    using TokenUtils for address;

    struct Params {
        uint256 lqtyAmount;
        address to;
        address wethTo;
        address lusdTo;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.lqtyAmount = _parseParamUint(params.lqtyAmount, _paramMapping[0], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);
        params.wethTo = _parseParamAddr(params.wethTo, _paramMapping[2], _subData, _returnValues);
        params.lusdTo = _parseParamAddr(params.lusdTo, _paramMapping[3], _subData, _returnValues);

        params.lqtyAmount = _liquityUnstake(params);
        return bytes32(params.lqtyAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        _liquityUnstake(params);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Dont forget natspec
    function _liquityUnstake(Params memory _params) internal returns (uint256) {
        uint256 ethGain = LQTYStaking.getPendingETHGain(address(this));
        uint256 lusdGain = LQTYStaking.getPendingLUSDGain(address(this));

        uint256 staked = LQTYStaking.stakes(address(this));
        _params.lqtyAmount = staked > _params.lqtyAmount ? _params.lqtyAmount : staked;

        LQTYStaking.unstake(_params.lqtyAmount);
        LQTYTokenAddr.withdrawTokens(_params.to, _params.lqtyAmount);

        TokenUtils.depositWeth(ethGain);
        TokenUtils.WETH_ADDR.withdrawTokens(_params.wethTo, ethGain);
        LUSDTokenAddr.withdrawTokens(_params.lusdTo, lusdGain);

        logger.Log(
            address(this),
            msg.sender,
            "LiquityUnstake",
            abi.encode(
                _params.lqtyAmount,
                _params.to,
                _params.wethTo,
                _params.lusdTo,
                ethGain,
                lusdGain
            )
        );

        return _params.lqtyAmount;
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (Params memory params) {
        params = abi.decode(_callData[0], (Params));
    }
}
