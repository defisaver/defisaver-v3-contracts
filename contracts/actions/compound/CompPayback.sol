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
        bytes32[] memory _subData,
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
    /// @param _onBehalf Repay on behalf of which address (if 0x0 defaults to proxy)
    function _payback(
        address _cTokenAddr,
        uint256 _amount,
        address _from,
        address _onBehalf
    ) internal returns (uint256) {
        address tokenAddr = getUnderlyingAddr(_cTokenAddr);

        // default to onBehalf of proxy
        if (_onBehalf == address(0)) {
            _onBehalf = address(this);
        }

        uint256 maxDebt = ICToken(_cTokenAddr).borrowBalanceCurrent(_onBehalf);
        _amount = _amount > maxDebt ? maxDebt : _amount;

        tokenAddr.pullTokensIfNeeded(_from, _amount);

        // we always expect actions to deal with WETH never Eth
        if (tokenAddr != TokenUtils.WETH_ADDR) {
            tokenAddr.approveToken(_cTokenAddr, _amount);
            if (ICToken(_cTokenAddr).repayBorrow(_amount) != NO_ERROR){
                revert CompPaybackError();
            }
        } else {
            TokenUtils.withdrawWeth(_amount);
            ICToken(_cTokenAddr).repayBorrowBehalf{value: _amount}(_onBehalf); // reverts on fail
        }

        logger.Log(address(this), msg.sender, "CompPayback", abi.encode(tokenAddr, _amount, _from, _onBehalf));

        return _amount;
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
