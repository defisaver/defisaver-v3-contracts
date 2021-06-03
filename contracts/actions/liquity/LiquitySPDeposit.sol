// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "./helpers/LiquityHelper.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";

contract LiquitySPDeposit is ActionBase, LiquityHelper {
    using TokenUtils for address;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        (uint256 lusdAmount, address from) = parseInputs(_callData);
        lusdAmount = _parseParamUint(lusdAmount, _paramMapping[0], _subData, _returnValues);
        from = _parseParamAddr(from, _paramMapping[1], _subData, _returnValues);

        lusdAmount = _liquitySPDeposit(lusdAmount, from);
        return bytes32(lusdAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable virtual override {
        (uint256 lusdAmount, address from) = parseInputs(_callData);

        _liquitySPDeposit(lusdAmount, from);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Dont forget natspec
    function _liquitySPDeposit(uint256 _lusdAmount, address _from) internal returns (uint256) {
        // TODO consider adding a destination address for gains
        if (_lusdAmount == type(uint256).max) {
            _lusdAmount = LUSDTokenAddr.getBalance(_from);
        }

        uint256 ethGain = StabilityPool.getDepositorETHGain(address(this));
        uint256 lqtyGain = StabilityPool.getDepositorLQTYGain(address(this));

        LUSDTokenAddr.pullTokensIfNeeded(_from, _lusdAmount);
        StabilityPool.provideToSP(_lusdAmount, address(0));   // No registered frontend means 100% kickback rate for LQTY rewards

        logger.Log(
            address(this),
            msg.sender,
            "LiquitySPDeposit",
            abi.encode(
                _lusdAmount,
                _from,
                ethGain,
                lqtyGain
            )
        );

        return _lusdAmount;
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (uint256 lusdAmount, address from) {
        lusdAmount = abi.decode(_callData[0], (uint256));
        from = abi.decode(_callData[1], (address));
    }
}
