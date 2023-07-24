// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/SparkHelper.sol";
import "../../interfaces/aaveV3/IDebtToken.sol";

/// @title Delegate credit for someone to borrow on DSProxys behalf
contract SparkDelegateCredit is ActionBase, SparkHelper {
    using TokenUtils for address;
    
    error NonExistantRateMode();

    struct Params {
        address delegatee;
        address token;
        uint256 amount;
        uint8 rateMode;
        bool useDefaultMarket;
        address market;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes calldata _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.market = _parseParamAddr(params.market, _paramMapping[0], _subData, _returnValues);

        (uint256 categoryId, bytes memory logData) = _delegate(params);
        emit ActionEvent("SparkDelegateCredit", logData);
        return bytes32(categoryId);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes calldata _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _delegate(params);
        logger.logActionDirectEvent("SparkDelegateCredit", logData);
    }

    function executeActionDirectL2() public payable {
        Params memory params = decodeInputs(msg.data[4:]);
        (, bytes memory logData) = _delegate(params);
        logger.logActionDirectEvent("SparkDelegateCredit", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _delegate(Params memory _params)
        internal
        returns (uint256, bytes memory)
    {
        IPoolV3 lendingPool = getLendingPool(_params.market);
        DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(_params.token);

        if (_params.rateMode == VARIABLE_ID){
            IDebtToken(reserveData.variableDebtTokenAddress).approveDelegation(_params.delegatee, _params.amount);
        } else if (_params.rateMode == STABLE_ID){
            IDebtToken(reserveData.stableDebtTokenAddress).approveDelegation(_params.delegatee, _params.amount);
        } else {
            revert NonExistantRateMode();
        }
        bytes memory logData = abi.encode(_params);

        return (_params.amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
        if (params.useDefaultMarket) {
            params.market = DEFAULT_SPARK_MARKET;
        }
    }

    function encodeInputs(Params memory params) public pure returns (bytes memory encodedInput) {
        
    }

    function decodeInputs(bytes calldata encodedInput) public pure returns (Params memory params) {
        
    }
}
