// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { TokenUtils } from "../../utils/TokenUtils.sol";
import { ActionBase } from "../ActionBase.sol";
import { SparkHelper } from "./helpers/SparkHelper.sol";
import { IPoolV3 } from "../../interfaces/aaveV3/IPoolV3.sol";

/// @title Swaps user's wallet positions borrow rate mode between stable and variable.
contract SparkSwapBorrowRateMode is ActionBase, SparkHelper {
    using TokenUtils for address;
    
    /// @param rateMode Type of borrow debt [Stable: 1, Variable: 2]
    /// @param assetId The id of the token to be swapped
    /// @param useDefaultMarket Whether to use the default market
    /// @param market Address of the market to swap borrow rate mode for
    struct Params {
        uint256 rateMode;
        uint16 assetId;
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

        inputData.market = _parseParamAddr(inputData.market, _paramMapping[0], _subData, _returnValues);

        (, bytes memory logData) = _swapBorrowRate(inputData);

        emit ActionEvent("SparkSwapBorrowRateMode", logData);
        return bytes32(0);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        (, bytes memory logData) = _swapBorrowRate(inputData);
        logger.logActionDirectEvent("SparkSwapBorrowRateMode", logData);
    }

    function executeActionDirectL2() public payable {
        Params memory inputData = decodeInputs(msg.data[4:]);
        (, bytes memory logData) = _swapBorrowRate(inputData);
        logger.logActionDirectEvent("SparkSwapBorrowRateMode", logData);
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
        address tokenAddr = lendingPool.getReserveAddressById(_inputData.assetId);
        lendingPool.swapBorrowRateMode(tokenAddr, _inputData.rateMode);
        bytes memory logData = abi.encode(_inputData);
        return (0, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
        if (params.useDefaultMarket) {
            params.market = DEFAULT_SPARK_MARKET;
        }
    }

    function encodeInputs(Params memory _params) public pure returns (bytes memory encodedInput) {
        encodedInput = bytes.concat(this.executeActionDirectL2.selector);
        encodedInput = bytes.concat(encodedInput, bytes32(_params.rateMode));
        encodedInput = bytes.concat(encodedInput, bytes2(_params.assetId));
        encodedInput = bytes.concat(encodedInput, boolToBytes(_params.useDefaultMarket));
        if (!_params.useDefaultMarket) {
            encodedInput = bytes.concat(encodedInput, bytes20(_params.market));
        }
    }

    function decodeInputs(bytes calldata _encodedInput) public pure returns (Params memory params) {
        params.rateMode = uint256(bytes32(_encodedInput[0:32]));
        params.assetId = uint16(bytes2(_encodedInput[32:34]));
        params.useDefaultMarket = bytesToBool(bytes1(_encodedInput[34:35]));

        if (params.useDefaultMarket) {
            params.market = DEFAULT_SPARK_MARKET;
        } else {
            params.market = address(bytes20(_encodedInput[35:55]));
        }
    }
}
