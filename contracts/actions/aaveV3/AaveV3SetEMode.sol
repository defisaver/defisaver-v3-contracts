// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { TokenUtils } from "../../utils/TokenUtils.sol";
import { ActionBase } from "../ActionBase.sol";
import { AaveV3Helper } from "./helpers/AaveV3Helper.sol";
import { IPoolV3 } from "../../interfaces/aaveV3/IPoolV3.sol";

/// @title Set positions eMode on Aave v3
contract AaveV3SetEMode is ActionBase, AaveV3Helper {
    using TokenUtils for address;

    /// @param categoryId eMode category id (0 - 255).
    /// @param useDefaultMarket Whether to use the default market.
    /// @param market Aave Market address.
    struct Params {
        uint8 categoryId;
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
        Params memory params = parseInputs(_callData);

        params.market = _parseParamAddr(params.market, _paramMapping[0], _subData, _returnValues);

        (uint256 categoryId, bytes memory logData) = _setEmode(params.market, params.categoryId);
        emit ActionEvent("AaveV3SetEMode", logData);
        return bytes32(categoryId);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _setEmode(params.market, params.categoryId);
        logger.logActionDirectEvent("AaveV3SetEMode", logData);
    }

    function executeActionDirectL2() public payable {
        Params memory params = decodeInputs(msg.data[4:]);
        (, bytes memory logData) = _setEmode(params.market, params.categoryId);
        logger.logActionDirectEvent("AaveV3SetEMode", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice User sets EMode for Aave position on its wallet
    /// @param _market Address provider for specific market
    /// @param _categoryId eMode category id (0 - 255)
    function _setEmode(address _market, uint8 _categoryId)
        internal
        returns (uint256, bytes memory)
    {
        IPoolV3 lendingPool = getLendingPool(_market);
        lendingPool.setUserEMode(_categoryId);

        bytes memory logData = abi.encode(_market, _categoryId);
        return (_categoryId, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
        if (params.useDefaultMarket) {
            params.market = DEFAULT_AAVE_MARKET;
        }
    }

    function encodeInputs(Params memory _params) public pure returns (bytes memory encodedInput) {
        encodedInput = bytes.concat(this.executeActionDirectL2.selector);
        encodedInput = bytes.concat(encodedInput, bytes1(_params.categoryId));
        encodedInput = bytes.concat(encodedInput, boolToBytes(_params.useDefaultMarket));
        if (!_params.useDefaultMarket) {
            encodedInput = bytes.concat(encodedInput, bytes20(_params.market));
        }
    }

    function decodeInputs(bytes calldata _encodedInput) public pure returns (Params memory params) {
        params.categoryId = uint8(bytes1(_encodedInput[0:1]));
        params.useDefaultMarket = bytesToBool(bytes1(_encodedInput[1:2]));
        if (params.useDefaultMarket) {
            params.market = DEFAULT_AAVE_MARKET;
        } else {
            params.market = address(bytes20(_encodedInput[2:22]));
        }
    }
}
