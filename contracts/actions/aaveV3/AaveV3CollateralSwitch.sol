// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/AaveV3Helper.sol";

/// @title Switch if you'll use tokens for collateral on aave for a market
contract AaveV3CollateralSwitch is ActionBase, AaveV3Helper {
    using TokenUtils for address;
    struct Params {
        address market;
        uint8 arrayLength;
        address[] tokens;
        bool[] useAsCollateral;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);
        _switchAsCollateral(inputData);
        return bytes32(0);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _switchAsCollateral(inputData);
    }
    

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _switchAsCollateral(Params memory _inputData) internal {
        IPoolV3 lendingPool = getLendingPool(_inputData.market);
        for (uint256 i = 0; i < _inputData.arrayLength; i++){
            lendingPool.setUserUseReserveAsCollateral(_inputData.tokens[i], _inputData.useAsCollateral[i]);
        }
    }

    function parseInputs(bytes memory _callData) internal pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }

    function encodeInputs(Params memory params) public pure returns (bytes memory encodedInput) {
        encodedInput = bytes.concat(this.executeActionDirectL2.selector);
    }

    function decodeInputs(bytes calldata encodedInput) public pure returns (Params memory params) {
    }
}
