// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../interfaces/IWETH.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/CompV3Helper.sol";

/// @title Supply a token to Compound
contract CompV3Supply is ActionBase, CompV3Helper {
    using TokenUtils for address;
    struct Params {
        address tokenAddr;
        uint256 amount;
        address from;
    }

    error CompV3SupplyError();
    error CompV3SupplyWithDebtError();

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.tokenAddr = _parseParamAddr(params.tokenAddr, _paramMapping[0], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[1], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[2], _subData, _returnValues);

        (uint256 withdrawAmount, bytes memory logData) = _supply(params.tokenAddr, params.amount, params.from);
        emit ActionEvent("CompV3Supply", logData);
        return bytes32(withdrawAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _supply(params.tokenAddr, params.amount, params.from);
        logger.logActionDirectEvent("CompV3Supply", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Supplies a token to the CompoundV3 protocol
    /// @dev If amount == type(uint256).max we are getting the whole balance of the proxy
    /// @param _tokenAddr Address of the token we are supplying
    /// @param _amount Amount of the token we are supplying
    /// @param _from Address where we are pulling the tokens from
    function _supply(
        address _tokenAddr,
        uint256 _amount,
        address _from
    ) internal returns (uint256, bytes memory) {
        
        // pull the tokens _from to the proxy
        _amount = _tokenAddr.pullTokensIfNeeded(_from, _amount);

        _tokenAddr.approveToken(COMET_ADDR, _amount);

        if(_tokenAddr == IComet(COMET_ADDR).baseToken())
        {
            uint256 debt = IComet(COMET_ADDR).borrowBalanceOf(address(this));
            if(debt > 0)
                revert CompV3SupplyWithDebtError();
        }
        
        IComet(COMET_ADDR).supply(_tokenAddr,_amount);
        
        bytes memory logData = abi.encode(_tokenAddr, _amount, _from);
        return (_amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}