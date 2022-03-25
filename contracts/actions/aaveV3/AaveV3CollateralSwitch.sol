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
        uint16[] assetIds;
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
        (, bytes memory logData) = _switchAsCollateral(inputData);

        emit ActionEvent("AaveV3CollateralSwitch", logData);
        return bytes32(0);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        (, bytes memory logData) = _switchAsCollateral(inputData);
        //logger.logActionDirectEvent("AaveV3CollateralSwitch", logData);
    }

    function executeActionDirectL2() public payable {
        Params memory inputData = decodeInputs(msg.data[4:]);
        (, bytes memory logData) = _switchAsCollateral(inputData);
        //logger.logActionDirectEvent("AaveV3CollateralSwitch", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _switchAsCollateral(Params memory _inputData)
        internal
        returns (uint256, bytes memory)
    {
        IPoolV3 lendingPool = getLendingPool(_inputData.market);
        for (uint256 i = 0; i < _inputData.arrayLength; i++) {
            address tokenAddr = lendingPool.getReserveAddressById(_inputData.assetIds[i]);
            lendingPool.setUserUseReserveAsCollateral(tokenAddr, _inputData.useAsCollateral[i]);
        }
        bytes memory logData = abi.encode(_inputData);
        return (0, logData);
    }

    function parseInputs(bytes memory _callData) internal pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }

    function encodeInputs(Params memory params) public pure returns (bytes memory encodedInput) {
        encodedInput = bytes.concat(this.executeActionDirectL2.selector);
        encodedInput = bytes.concat(encodedInput, bytes20(params.market));
        encodedInput = bytes.concat(encodedInput, bytes1(params.arrayLength));
        for (uint256 i = 0; i < params.arrayLength; i++) {
            encodedInput = bytes.concat(encodedInput, bytes2(params.assetIds[i]));
            encodedInput = bytes.concat(encodedInput, boolToBytes(params.useAsCollateral[i]));
        }
    }

    function decodeInputs(bytes calldata encodedInput) public pure returns (Params memory params) {
        params.market = address(bytes20(encodedInput[0:20]));
        params.arrayLength = uint8(bytes1(encodedInput[20:21]));
        uint16[] memory assetIds = new uint16[](params.arrayLength);
        bool[] memory useAsCollateral = new bool[](params.arrayLength);
        for (uint256 i = 0; i < params.arrayLength; i++) {
            assetIds[i] = uint16(bytes2(encodedInput[(21 + i * 3):(23 + i * 2)]));
            useAsCollateral[i] = bytesToBool(bytes1(encodedInput[(23 + i * 2):(24 + i * 2)]));
        }
        params.assetIds = assetIds;
        params.useAsCollateral = useAsCollateral;
    }
}
