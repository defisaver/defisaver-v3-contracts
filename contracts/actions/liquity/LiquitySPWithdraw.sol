// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "./helpers/LiquityHelper.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";

contract LiquitySPWithdraw is ActionBase, LiquityHelper {
    using TokenUtils for address;

    struct Params {
        uint256 lusdAmount; // Amount of LUSD tokens to withdraw
        address to;         // Address that will receive the tokens
        address wethTo;     // Address that will receive ETH(wrapped) gains
        address lqtyTo;     // Address that will receive LQTY token gains
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.lusdAmount = _parseParamUint(params.lusdAmount, _paramMapping[0], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);
        params.wethTo = _parseParamAddr(params.wethTo, _paramMapping[2], _subData, _returnValues);
        params.lqtyTo = _parseParamAddr(params.lqtyTo, _paramMapping[3], _subData, _returnValues);

        params.lusdAmount = _liquitySPWithdraw(params);
        return bytes32(params.lusdAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        _liquitySPWithdraw(params);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Withdraws LUSD from the user's stability pool deposit
    function _liquitySPWithdraw(Params memory _params) internal returns (uint256) {
        uint256 ethGain = StabilityPool.getDepositorETHGain(address(this));
        uint256 lqtyGain = StabilityPool.getDepositorLQTYGain(address(this));

        uint256 deposit = StabilityPool.getCompoundedLUSDDeposit(address(this));
        _params.lusdAmount = deposit > _params.lusdAmount ? _params.lusdAmount : deposit;

        StabilityPool.withdrawFromSP(_params.lusdAmount);
        // Amount goes through min(amount, depositedAmount)
        LUSDTokenAddr.withdrawTokens(_params.to, _params.lusdAmount);

        withdrawStabilityGains(ethGain, lqtyGain, _params.wethTo, _params.lqtyTo);

        logger.Log(
            address(this),
            msg.sender,
            "LiquitySPWithdraw",
            abi.encode(
                _params,
                ethGain,
                lqtyGain
            )
        );

        return _params.lusdAmount;
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
