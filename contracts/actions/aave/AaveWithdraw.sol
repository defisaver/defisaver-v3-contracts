// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../../interfaces/IWETH.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/AaveHelper.sol";

/// @title Withdraw a token from an Aave market
contract AaveWithdraw is ActionBase, AaveHelper {
    using TokenUtils for address;

    struct Params {
        address market;
        address tokenAddr;
        uint256 amount;
        address to;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.market = _parseParamAddr(params.market, _paramMapping[0], _subData, _returnValues);
        params.tokenAddr = _parseParamAddr(params.tokenAddr, _paramMapping[1], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[2], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[3], _subData, _returnValues);

        uint256 withdrawAmount = _withdraw(params.market, params.tokenAddr, params.amount, params.to);

        return bytes32(withdrawAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);

        _withdraw(params.market, params.tokenAddr, params.amount, params.to);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice User withdraws tokens from the Aave protocol
    /// @param _market Address provider for specific market
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

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
