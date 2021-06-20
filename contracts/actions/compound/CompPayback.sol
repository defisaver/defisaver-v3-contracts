// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;

import "../../interfaces/compound/IComptroller.sol";
import "../../interfaces/compound/ICToken.sol";
import "../../interfaces/IWETH.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/CompHelper.sol";

/// @title Payback a token a user borrowed from Compound
contract CompPayback is ActionBase, CompHelper {
    using TokenUtils for address;

    struct Params {
        address cTokenAddr;
        uint256 amount;
        address from;
    }
    error CompPaybackError();

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.cTokenAddr = _parseParamAddr(params.cTokenAddr, _paramMapping[0], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[1], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[2], _subData, _returnValues);

        uint256 withdrawAmount = _payback(params.cTokenAddr, params.amount, params.from);

        return bytes32(withdrawAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);

        _payback(params.cTokenAddr, params.amount, params.from);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Payback a borrowed token from the Compound protocol
    /// @dev Amount type(uint).max will take the whole borrow amount
    /// @param _cTokenAddr Address of the cToken we are paying back
    /// @param _amount Amount of the underlying token
    /// @param _from Address where we are pulling the underlying tokens from
    function _payback(
        address _cTokenAddr,
        uint256 _amount,
        address _from
    ) internal returns (uint256) {
        address tokenAddr = getUnderlyingAddr(_cTokenAddr);

        // if type(uint).max payback whole amount
        if (_amount == type(uint256).max) {
            _amount = ICToken(_cTokenAddr).borrowBalanceCurrent(address(this));
        }

        tokenAddr.pullTokensIfNeeded(_from, _amount);

        // we always expect actions to deal with WETH never Eth
        if (tokenAddr != TokenUtils.WETH_ADDR) {
            tokenAddr.approveToken(_cTokenAddr, _amount);
            if (ICToken(_cTokenAddr).repayBorrow(_amount) != NO_ERROR){
                revert CompPaybackError();
            }
        } else {
            TokenUtils.withdrawWeth(_amount);
            ICToken(_cTokenAddr).repayBorrow{value: _amount}(); // reverts on fail
        }

        logger.Log(address(this), msg.sender, "CompPayback", abi.encode(tokenAddr, _amount, _from));

        return _amount;
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
