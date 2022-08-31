// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/CompV3Helper.sol";
import "../../interfaces/IERC20.sol";

/// @title Payback a token a user borrowed from Compound
contract CompV3Payback is ActionBase, CompV3Helper {
    using TokenUtils for address;

    struct Params {
        uint256 amount;
        address from;
        address onBehalf;
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
        params.from = _parseParamAddr(params.from, _paramMapping[1], _subData, _returnValues);
        params.onBehalf = _parseParamAddr(params.onBehalf, _paramMapping[2], _subData, _returnValues);

        (uint256 withdrawAmount, bytes memory logData) = _payback(params.amount, params.from, params.onBehalf);
        emit ActionEvent("CompV3Payback", logData);
        return bytes32(withdrawAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _payback(params.amount, params.from, params.onBehalf);
        logger.logActionDirectEvent("CompV3Payback", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Payback a borrowed token from the CompoundV3 protocol
    /// @dev Amount type(uint).max will take the whole borrow amount
    /// @param _amount Amount of the base token to be repaid
    /// @param _from Address where we are pulling the underlying tokens from
    /// @param _onBehalf Repay on behalf of which address (if 0x0 defaults to proxy)
    function _payback(
        uint256 _amount,
        address _from,
        address _onBehalf
    ) internal returns (uint256, bytes memory) {
        address tokenAddr = IComet(COMET_ADDR).baseToken();

        // default to onBehalf of proxy 
        if (_onBehalf == address(0)) {
            _onBehalf = address(this);
        }

        uint256 maxDebt = IComet(COMET_ADDR).borrowBalanceOf(_onBehalf);
        _amount = _amount > maxDebt ? maxDebt : _amount;

        tokenAddr.pullTokensIfNeeded(_from, _amount);

        //authorization
        tokenAddr.approveToken(COMET_ADDR, _amount);

        //function
        IComet(COMET_ADDR).supply(tokenAddr, _amount);
        
        bytes memory logData = abi.encode(_amount, _from, _onBehalf);
        return (_amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
