// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";

/// @title Helper action to un-wrap WETH9 to Eth
contract UnwrapEth is ActionBase {
    using TokenUtils for address;

    struct Params {
        uint256 amount;
        address to;
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
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[1], _subData, _returnValues);

        return bytes32(_unwrapEth(inputData.amount, inputData.to));
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _unwrapEth(inputData.amount, inputData.to);
    }
    function executeActionDirectL2() public payable {
        Params memory params = decodeInputs(msg.data[4:]);

        _unwrapEth(params.amount, params.to);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Unwraps WETH9 -> Eth
    /// @param _amount Amount of Weth to unwrap
    /// @param _to Address where to send the unwrapped Eth
    function _unwrapEth(uint256 _amount, address _to) internal returns (uint256) {
        if (_amount == type(uint256).max) {
            _amount = TokenUtils.WETH_ADDR.getBalance(address(this));
        }

        TokenUtils.withdrawWeth(_amount);

        // if _to == proxy, it will stay on proxy
        TokenUtils.ETH_ADDR.withdrawTokens(_to, _amount);

        return _amount;
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
    function encodeInputs(Params memory params) public pure returns (bytes memory encodedInput) {
        encodedInput = bytes.concat(this.executeActionDirectL2.selector);
        encodedInput = bytes.concat(encodedInput, bytes32(params.amount));
        encodedInput = bytes.concat(encodedInput, bytes20(params.to));
    }
    function decodeInputs(bytes calldata encodedInput) public pure returns (Params memory params){
        params.amount = uint256(bytes32(encodedInput[0:32]));
        params.to = address(bytes20(encodedInput[32:52]));
    }
}
