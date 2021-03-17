// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/IWETH.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/AaveHelper.sol";

/// @title Withdraw a token from an Aave market
contract AaveWithdraw is ActionBase, AaveHelper {
    using TokenUtils for address;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        (address market, address tokenAddr, uint256 amount, address to) = parseInputs(_callData);

        market = _parseParamAddr(market, _paramMapping[0], _subData, _returnValues);
        tokenAddr = _parseParamAddr(tokenAddr, _paramMapping[1], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[2], _subData, _returnValues);
        to = _parseParamAddr(to, _paramMapping[3], _subData, _returnValues);

        uint256 withdrawAmount = _withdraw(market, tokenAddr, amount, to);

        return bytes32(withdrawAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        (address market, address tokenAddr, uint256 amount, address from) = parseInputs(_callData);

        _withdraw(market, tokenAddr, amount, from);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice User withdraws tokens from the Aave protocol
    /// @param _market address provider for specific market
    /// @param _tokenAddr The address of the token to be withdrawn
    /// @param _amount Amount of tokens to be withdrawn -> send type(uint).max for whole amount
    /// @param _to Where the withdrawn tokens will be sent
    function _withdraw(
        address _market,
        address _tokenAddr,
        uint256 _amount,
        address _to
    ) internal returns (uint256) {
        ILendingPoolV2 lendingPool = getLendingPool(_market);
        uint256 tokenBefore;

        // only need to remember this is _amount is max, no need to waste gas otherwise
        if (_amount == type(uint256).max) {
            tokenBefore = _tokenAddr.getBalance(_to);
        }

        // if _to is an empty address, withdraw it to the proxy to prevent burning the tokens
        if (_to == address(0)) {
            _to = address(this);
        }

        // withdraw underlying tokens from aave and send _to address
        lendingPool.withdraw(_tokenAddr, _amount, _to);

        // if the input amount is max calc. what was the exact _amount
        if (_amount == type(uint256).max) {
            _amount = _tokenAddr.getBalance(_to) - tokenBefore;
        }

        logger.Log(
            address(this),
            msg.sender,
            "AaveWithdraw",
            abi.encode(_market, _tokenAddr, _amount, _to)
        );

        return _amount;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            address market,
            address tokenAddr,
            uint256 amount,
            address to
        )
    {
        market = abi.decode(_callData[0], (address));
        tokenAddr = abi.decode(_callData[1], (address));
        amount = abi.decode(_callData[2], (uint256));
        to = abi.decode(_callData[3], (address));
    }
}
