// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISparkPool } from "../../interfaces/spark/ISparkPool.sol";
import { ISparkDebtToken } from "../../interfaces/spark/ISparkDebtToken.sol";
import { SparkDataTypes } from "../../interfaces/spark/SparkDataTypes.sol";
import { SparkHelper } from "./helpers/SparkHelper.sol";

import { TokenUtils } from "../../utils/TokenUtils.sol";
import { ActionBase } from "../ActionBase.sol";
import { DFSLib } from "../../utils/DFSLib.sol";

/// @title Delegate credit for someone to borrow on user's wallet behalf
contract SparkDelegateCredit is ActionBase, SparkHelper {
    using TokenUtils for address;

    uint256 internal constant STABLE_ID = 1;
    uint256 internal constant VARIABLE_ID = 2;
    
    error NonExistantRateMode();

    /// @param amount Amount of tokens to delegate
    /// @param delegatee Address of the delegatee
    /// @param assetId The id of the token to be delegated
    /// @param rateMode Type of borrow debt [Stable: 1, Variable: 2]
    /// @param useDefaultMarket Whether to use the default market
    /// @param market Address of the market to delegate credit for
    struct Params {
        uint256 amount;
        address delegatee;
        uint16 assetId;
        uint8 rateMode;
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

        params.amount = _parseParamUint(params.amount, _paramMapping[0], _subData, _returnValues);
        params.delegatee = _parseParamAddr(params.delegatee, _paramMapping[1], _subData, _returnValues);
        params.assetId = uint16(_parseParamUint(uint16(params.assetId), _paramMapping[2], _subData, _returnValues));
        params.rateMode = uint8(_parseParamUint(uint8(params.rateMode), _paramMapping[3], _subData, _returnValues));
        params.useDefaultMarket = _parseParamUint(params.useDefaultMarket ? 1 : 0, _paramMapping[4], _subData, _returnValues) == 1;
        params.market = _parseParamAddr(params.market, _paramMapping[5], _subData, _returnValues);

        (bytes memory logData) = _delegate(params);
        emit ActionEvent("SparkDelegateCredit", logData);
        return bytes32(params.amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (bytes memory logData) = _delegate(params);
        logger.logActionDirectEvent("SparkDelegateCredit", logData);
    }

    function executeActionDirectL2() public payable {
        Params memory params = decodeInputs(msg.data[4:]);
        (bytes memory logData) = _delegate(params);
        logger.logActionDirectEvent("SparkDelegateCredit", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _delegate(Params memory _params)
        internal
        returns (bytes memory logData)
    {
        ISparkPool lendingPool = getSparkLendingPool(_params.market);
        address tokenAddr = lendingPool.getReserveAddressById(_params.assetId);
        SparkDataTypes.ReserveData memory reserveData = lendingPool.getReserveData(tokenAddr);

        if (_params.rateMode == VARIABLE_ID){
            ISparkDebtToken(reserveData.variableDebtTokenAddress).approveDelegation(_params.delegatee, _params.amount);
        } else if (_params.rateMode == STABLE_ID){
            ISparkDebtToken(reserveData.stableDebtTokenAddress).approveDelegation(_params.delegatee, _params.amount);
        } else {
            revert NonExistantRateMode();
        }
        logData = abi.encode(_params);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
        if (params.useDefaultMarket) {
            params.market = DEFAULT_SPARK_MARKET;
        }
    }

    function encodeInputs(Params memory _params) public pure returns (bytes memory encodedInput) {
        encodedInput = bytes.concat(this.executeActionDirectL2.selector);
        encodedInput = bytes.concat(encodedInput, bytes32(_params.amount));
        encodedInput = bytes.concat(encodedInput, bytes20(_params.delegatee));
        encodedInput = bytes.concat(encodedInput, bytes2(_params.assetId));
        encodedInput = bytes.concat(encodedInput, bytes1(_params.rateMode));
        encodedInput = bytes.concat(encodedInput, DFSLib.boolToBytes(_params.useDefaultMarket));
        if (!_params.useDefaultMarket) {
            encodedInput = bytes.concat(encodedInput, bytes20(_params.market));
        }
    }

    function decodeInputs(bytes calldata _encodedInput) public pure returns (Params memory params) {
        params.amount = uint256(bytes32(_encodedInput[0:32]));
        params.delegatee = address(bytes20(_encodedInput[32:52]));
        params.assetId = uint16(bytes2(_encodedInput[52:54]));
        params.rateMode = uint8(bytes1(_encodedInput[54:55]));
        params.useDefaultMarket = DFSLib.bytesToBool(bytes1(_encodedInput[55:56]));
        if (params.useDefaultMarket) {
            params.market = DEFAULT_SPARK_MARKET;
        } else {
            params.market = address(bytes20(_encodedInput[56:76]));
        }
    }
    
    function getCreditDelegation(address _market, uint16 _assetId, uint8 _rateMode, address _delegator, address _delegatee) public view returns (uint256 creditAvailable){
        ISparkPool lendingPool = getSparkLendingPool(_market);
        address tokenAddr = lendingPool.getReserveAddressById(_assetId);
        SparkDataTypes.ReserveData memory reserveData = lendingPool.getReserveData(tokenAddr);

        if (_rateMode == VARIABLE_ID){
            return ISparkDebtToken(reserveData.variableDebtTokenAddress).borrowAllowance(_delegator, _delegatee);
        } else if (_rateMode == STABLE_ID){
            return ISparkDebtToken(reserveData.stableDebtTokenAddress).borrowAllowance(_delegator, _delegatee);
        } else {
            revert NonExistantRateMode();
        }
    }
}
