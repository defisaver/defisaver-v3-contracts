// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "./helpers/LiquityHelper.sol";
import "../../utils/TokenUtils.sol";
import "../../utils/SafeMath.sol";
import "../ActionBase.sol";

contract LiquitySPDeposit is ActionBase, LiquityHelper {
    using TokenUtils for address;
    using SafeMath for uint256;

    struct Params {
        uint256 lusdAmount; // Amount of LUSD tokens to deposit
        address from;       // Address where to pull the tokens from
        address wethTo;     // Address that will receive ETH(wrapped) gains
        address lqtyTo;     // Address that will receive LQTY token gains
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.lusdAmount = _parseParamUint(params.lusdAmount, _paramMapping[0], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[1], _subData, _returnValues);
        params.wethTo = _parseParamAddr(params.wethTo, _paramMapping[2], _subData, _returnValues);
        params.lqtyTo = _parseParamAddr(params.lqtyTo, _paramMapping[3], _subData, _returnValues);

        params.lusdAmount = _liquitySPDeposit(params);
        return bytes32(params.lusdAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        _liquitySPDeposit(params);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Deposits LUSD to the stability pool
    function _liquitySPDeposit(Params memory _params) internal returns (uint256) {
        if (_params.lusdAmount == type(uint256).max) {
            _params.lusdAmount = LUSDTokenAddr.getBalance(_params.from);
        }

        uint256 ethGain = StabilityPool.getDepositorETHGain(address(this));
        uint256 lqtyBefore = LQTYTokenAddr.getBalance(address(this));

        LUSDTokenAddr.pullTokensIfNeeded(_params.from, _params.lusdAmount);
        StabilityPool.provideToSP(_params.lusdAmount, address(0));   // No registered frontend means 100% kickback rate for LQTY rewards

        uint256 lqtyGain = LQTYTokenAddr.getBalance(address(this)).sub(lqtyBefore);

        withdrawStabilityGains(ethGain, lqtyGain, _params.wethTo, _params.lqtyTo);

        logger.Log(
            address(this),
            msg.sender,
            "LiquitySPDeposit",
            abi.encode(
                _params,
                ethGain,
                lqtyGain
            )
        );

        return _params.lusdAmount;
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (Params memory params) {
        params = abi.decode(_callData[0], (Params));
    }
}
