// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";

/// @title Helper action to wrap Ether to WETH9
contract WrapEth is ActionBase {
    struct Params {
        uint256 amount;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.amount = _parseParamUint(inputData.amount, _paramMapping[0], _subData, _returnValues);

        return bytes32(_wrapEth(inputData.amount));
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public payable override {
        uint256 amount = abi.decode(_callData, (uint256));

        _wrapEth(amount);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Wraps native Eth to WETH9 token
    /// @param _amount Amount of ether to wrap, if type(uint256).max wraps whole balance
    function _wrapEth(uint256 _amount) internal returns (uint256) {
        if (_amount == type(uint256).max) {
            _amount = address(this).balance;
        }

        TokenUtils.depositWeth(_amount);
        return _amount;
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
