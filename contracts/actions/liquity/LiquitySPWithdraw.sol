// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "./helpers/LiquityHelper.sol";
import "../../utils/TokenUtils.sol";
import "../../utils/SafeMath.sol";
import "../ActionBase.sol";

contract LiquitySPWithdraw is ActionBase, LiquityHelper {
    using TokenUtils for address;
    
    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        (uint256 lusdAmount, address to) = parseInputs(_callData);
        lusdAmount = _parseParamUint(lusdAmount, _paramMapping[0], _subData, _returnValues);
        to = _parseParamAddr(to, _paramMapping[1], _subData, _returnValues);

        lusdAmount = _liquitySPWithdraw(lusdAmount, to);
        return bytes32(lusdAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable virtual override {
        (uint256 lusdAmount, address from) = parseInputs(_callData);

        _liquitySPWithdraw(lusdAmount, from);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Dont forget natspec
    function _liquitySPWithdraw(uint256 _lusdAmount, address _to) internal returns (uint256) {
        // TODO consider adding a destination address for gains
        uint256 ethGain = StabilityPool.getDepositorETHGain(address(this));
        uint256 lqtyGain = StabilityPool.getDepositorLQTYGain(address(this));

        uint256 deposit = StabilityPool.getCompoundedLUSDDeposit(address(this));
        _lusdAmount = deposit > _lusdAmount ? _lusdAmount : deposit;

        StabilityPool.withdrawFromSP(_lusdAmount);
        // Amount goes trough min(amount, depositedAmount)

        LUSDTokenAddr.withdrawTokens(_to, _lusdAmount);

        logger.Log(
            address(this),
            msg.sender,
            "LiquitySPWithdraw",
            abi.encode(
                _lusdAmount,
                _to,
                ethGain,
                lqtyGain
            )
        );

        return _lusdAmount;
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (uint256 lusdAmount, address to) {
        lusdAmount = abi.decode(_callData[0], (uint256));
        to = abi.decode(_callData[1], (address));
    }
}
