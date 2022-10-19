// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/CompV3Helper.sol";

/// @title Supply a token to CompoundV3
contract CompV3Supply is ActionBase, CompV3Helper {
    using TokenUtils for address;

    /// @param market Main Comet proxy contract that is different for each compound market
    /// @param tokenAddr  Address of the token we are supplying
    /// @param amount Amount in wei of tokens we are supplying
    /// @param from Address from which we are pulling the tokens
    /// @param onBehalf Address where we are supplying the tokens to
    struct Params {
        address market;
        address tokenAddr;
        uint256 amount;
        address from;
        address onBehalf;
    }

    error CompV3SupplyWithDebtError();

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.market = _parseParamAddr(params.market, _paramMapping[0], _subData, _returnValues);
        params.tokenAddr = _parseParamAddr(params.tokenAddr, _paramMapping[1], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[2], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[3], _subData, _returnValues);
        params.onBehalf = _parseParamAddr(params.onBehalf, _paramMapping[4], _subData, _returnValues);

        (uint256 withdrawAmount, bytes memory logData) = _supply(params);
        emit ActionEvent("CompV3Supply", logData);
        return bytes32(withdrawAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _supply(params);
        logger.logActionDirectEvent("CompV3Supply", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Supplies a token to the CompoundV3 protocol
    /// @dev If supply is baseToken it must not borrow balance or the action will revert
    /// @dev If onBehalf == address(0) we default to proxy address
    /// @param _params Supply input struct documented above
    function _supply(Params memory _params) internal returns (uint256, bytes memory) {
        if (_params.onBehalf == address(0)) {
            _params.onBehalf = address(this);
        }

        // pull the tokens _from to the proxy
        _params.amount = _params.tokenAddr.pullTokensIfNeeded(_params.from, _params.amount);

        _params.tokenAddr.approveToken(_params.market, _params.amount);

        // if the user has baseToken debt, use payback
        if(_params.tokenAddr == IComet(_params.market).baseToken()) {
            uint256 debt = IComet(_params.market).borrowBalanceOf(_params.onBehalf);
            if(debt > 0) {
                revert CompV3SupplyWithDebtError();
            }
        }
        
        IComet(_params.market).supplyTo(_params.onBehalf, _params.tokenAddr, _params.amount);
        
        bytes memory logData = abi.encode(_params);
        return (_params.amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}