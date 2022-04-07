// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/AaveV3Helper.sol";

/// @title Swaps proxy positions borrow rate mode between stable and variable.
contract AaveV3SwapBorrowRateMode is ActionBase, AaveV3Helper {
    using TokenUtils for address;
    struct Params {
        address asset;
        uint256 rateMode;
        bool useDefaultMarket;
        address market;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.asset = _parseParamAddr(inputData.asset, _paramMapping[0], _subData, _returnValues);
        inputData.market = _parseParamAddr(inputData.market, _paramMapping[1], _subData, _returnValues);

        (, bytes memory logData) = _swapBorrowRate(inputData);

        emit ActionEvent("AaveV3SwapBorrowRateMode", logData);
        return bytes32(0);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        (, bytes memory logData) = _swapBorrowRate(inputData);
        logger.logActionDirectEvent("AaveV3SwapBorrowRateMode", logData);
    }

    function executeActionDirectL2() public payable {
        Params memory inputData = decodeInputs(msg.data[4:]);
        (, bytes memory logData) = _swapBorrowRate(inputData);
        logger.logActionDirectEvent("AaveV3SwapBorrowRateMode", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _swapBorrowRate(Params memory _inputData)
        internal
        returns (uint256, bytes memory)
    {

        IPoolV3 lendingPool = getLendingPool(_inputData.market);
        lendingPool.swapBorrowRateMode(_inputData.asset, _inputData.rateMode);

        bytes memory logData = abi.encode(_inputData);
        return (0, logData);
    }

    function parseInputs(bytes memory _callData) internal pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
        if (params.useDefaultMarket) {
            params.market = DEFAULT_AAVE_MARKET;
        }
    }

    function encodeInputs(Params memory params) public pure returns (bytes memory encodedInput) {
        encodedInput = bytes.concat(this.executeActionDirectL2.selector);
        encodedInput = bytes.concat(encodedInput, bytes20(params.asset));
        encodedInput = bytes.concat(encodedInput, bytes32(params.rateMode));
        encodedInput = bytes.concat(encodedInput, boolToBytes(params.useDefaultMarket));
        if (!params.useDefaultMarket) {
            encodedInput = bytes.concat(encodedInput, bytes20(params.market));
        }
    }

    function decodeInputs(bytes calldata encodedInput) public pure returns (Params memory params) {
        params.asset = address(bytes20(encodedInput[0:20]));
        params.rateMode = uint256(bytes32(encodedInput[20:52]));
        params.useDefaultMarket = bytesToBool(bytes1(encodedInput[52:53]));

        if (params.useDefaultMarket) {
            params.market = DEFAULT_AAVE_MARKET;
        } else {
            params.market = address(bytes20(encodedInput[53:73]));
        }
    }
}
