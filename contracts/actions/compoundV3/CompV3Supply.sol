// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../interfaces/IWETH.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/CompV3Helper.sol";

/// @title Supply a token to CompoundV3
contract CompV3Supply is ActionBase, CompV3Helper {
    using TokenUtils for address;

    struct Params {
        address market;
        address tokenAddr;
        uint256 amount;
        address from;
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

        (uint256 withdrawAmount, bytes memory logData) = _supply(params.market, params.tokenAddr, params.amount, params.from);
        emit ActionEvent("CompV3Supply", logData);
        return bytes32(withdrawAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _supply(params.market, params.tokenAddr, params.amount, params.from);
        logger.logActionDirectEvent("CompV3Supply", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Supplies a token to the CompoundV3 protocol
    /// @dev If amount == type(uint256).max we are getting the whole balance of the proxy
    /// @param _market Main Comet proxy contract that is different for each compound market
    /// @param _tokenAddr Address of the token we are supplying
    /// @param _amount Amount of the token we are supplying
    /// @param _from Address where we are pulling the tokens from
    function _supply(
        address _market,
        address _tokenAddr,
        uint256 _amount,
        address _from
    ) internal returns (uint256, bytes memory) {
        
        // pull the tokens _from to the proxy
        _amount = _tokenAddr.pullTokensIfNeeded(_from, _amount);

        _tokenAddr.approveToken(_market, _amount);

        // if the user has baseToken debt, use payback
        if(_tokenAddr == IComet(_market).baseToken()) {
            uint256 debt = IComet(_market).borrowBalanceOf(address(this));
            if(debt > 0) {
                revert CompV3SupplyWithDebtError();
            }
        }
        
        IComet(_market).supply(_tokenAddr,_amount);
        
        bytes memory logData = abi.encode(_market, _tokenAddr, _amount, _from);
        return (_amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}