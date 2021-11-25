// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../interfaces/IWETH.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/CompHelper.sol";

/// @title Supply a token to Compound
contract CompSupply is ActionBase, CompHelper {
    using TokenUtils for address;
    struct Params {
        address cTokenAddr;
        uint256 amount;
        address from;
        bool enableAsColl;
    }

    error CompSupplyError();

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

        uint256 withdrawAmount = _supply(params.cTokenAddr, params.amount, params.from, params.enableAsColl);

        return bytes32(withdrawAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);

        _supply(params.cTokenAddr, params.amount, params.from, params.enableAsColl);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Supplies a token to the Compound protocol
    /// @dev If amount == type(uint256).max we are getting the whole balance of the proxy
    /// @param _cTokenAddr Address of the cToken we'll get when supplying
    /// @param _amount Amount of the underlying token we are supplying
    /// @param _from Address where we are pulling the underlying tokens from
    /// @param _enableAsColl If the supply asset should be collateral
    function _supply(
        address _cTokenAddr,
        uint256 _amount,
        address _from,
        bool _enableAsColl
    ) internal returns (uint256) {
        address tokenAddr = getUnderlyingAddr(_cTokenAddr);

        // if amount type(uint256).max, pull current _from balance
        if (_amount == type(uint256).max) {
            _amount = tokenAddr.getBalance(_from);
        }
        // pull the tokens _from to the proxy
        tokenAddr.pullTokensIfNeeded(_from, _amount);

        // enter the market if needed
        if (_enableAsColl) {
            enterMarket(_cTokenAddr);
        }

        // we always expect actions to deal with WETH never Eth
        if (tokenAddr != TokenUtils.WETH_ADDR) {
            tokenAddr.approveToken(_cTokenAddr, _amount);

            if (ICToken(_cTokenAddr).mint(_amount) != NO_ERROR){
                revert CompSupplyError();
            }
        } else {
            TokenUtils.withdrawWeth(_amount);
            ICToken(_cTokenAddr).mint{value: _amount}(); // reverts on fail
        }
        logger.Log(
            address(this),
            msg.sender,
            "CompSupply",
            abi.encode(tokenAddr, _amount, _from, _enableAsColl)
        );

        return _amount;
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
