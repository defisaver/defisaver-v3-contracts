// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISparkPool } from "../../interfaces/spark/ISparkPool.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";
import { ActionBase } from "../ActionBase.sol";
import { SparkHelper } from "./helpers/SparkHelper.sol";
import { DFSLib } from "../../utils/DFSLib.sol";

/// @title Switch if you'll use tokens for collateral on spark for a market
contract SparkCollateralSwitch is ActionBase, SparkHelper {
    using TokenUtils for address;
    
    /// @param arrayLength Length of the assetIds and useAsCollateral arrays
    /// @param useDefaultMarket Whether to use the default market
    /// @param assetIds Array of asset ids
    /// @param useAsCollateral Array of booleans indicating if the asset should be used as collateral
    /// @param market Address of the market to switch collateral for
    struct Params {
        uint8 arrayLength;
        bool useDefaultMarket;
        uint16[] assetIds;
        bool[] useAsCollateral;
        address market;
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

        emit ActionEvent("SparkCollateralSwitch", logData);
        return bytes32(0);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = _switchAsCollateral(inputData);
        logger.logActionDirectEvent("SparkCollateralSwitch", logData);
    }

    function executeActionDirectL2() public payable {
        Params memory inputData = decodeInputs(msg.data[4:]);
        (, bytes memory logData) = _switchAsCollateral(inputData);
        logger.logActionDirectEvent("SparkCollateralSwitch", logData);
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
        require (_inputData.arrayLength == _inputData.assetIds.length);
        require (_inputData.arrayLength == _inputData.useAsCollateral.length);

        ISparkPool lendingPool = getSparkLendingPool(_inputData.market);
        for (uint256 i = 0; i < _inputData.arrayLength; i++) {
            address tokenAddr = lendingPool.getReserveAddressById(_inputData.assetIds[i]);
            lendingPool.setUserUseReserveAsCollateral(tokenAddr, _inputData.useAsCollateral[i]);
        }
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
        require (uint256(_params.arrayLength) == _params.assetIds.length);
        require (uint256(_params.arrayLength) == _params.useAsCollateral.length);

        encodedInput = bytes.concat(this.executeActionDirectL2.selector);
        encodedInput = bytes.concat(encodedInput, bytes1(_params.arrayLength));
        encodedInput = bytes.concat(encodedInput, DFSLib.boolToBytes(_params.useDefaultMarket));
        for (uint256 i = 0; i < _params.arrayLength; i++) {
            encodedInput = bytes.concat(encodedInput, bytes2(_params.assetIds[i]));
            encodedInput = bytes.concat(encodedInput, DFSLib.boolToBytes(_params.useAsCollateral[i]));
        }
        if (!_params.useDefaultMarket) {
            encodedInput = bytes.concat(encodedInput, bytes20(_params.market));
        }
    }

    function decodeInputs(bytes calldata _encodedInput) public pure returns (Params memory params) {
        params.arrayLength = uint8(bytes1(_encodedInput[0:1]));
        params.useDefaultMarket = DFSLib.bytesToBool(bytes1(_encodedInput[1:2]));
        uint16[] memory assetIds = new uint16[](params.arrayLength);
        bool[] memory useAsCollateral = new bool[](params.arrayLength);
        for (uint256 i = 0; i < params.arrayLength; i++) {
            assetIds[i] = uint16(bytes2(_encodedInput[(2 + i * 3):(4 + i * 3)]));
            useAsCollateral[i] = DFSLib.bytesToBool(bytes1(_encodedInput[(4 + i * 3):(5 + i * 3)]));
        }
        params.assetIds = assetIds;
        params.useAsCollateral = useAsCollateral;

        if (params.useDefaultMarket) {
            params.market = DEFAULT_SPARK_MARKET;
        } else {
            params.market = address(
                bytes20(
                    _encodedInput[(5 + (params.arrayLength - 1) * 3):(25 +
                        (params.arrayLength - 1) *
                        3)]
                )
            );
        }
    }
}
