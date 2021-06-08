// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../../interfaces/IWETH.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/DyDxHelper.sol";

/// @title Withdraw tokens from DyDx
contract DyDxWithdraw is ActionBase, DyDxHelper {
    using TokenUtils for address;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        (address tokenAddr, uint256 amount, address to) = parseInputs(_callData);

        tokenAddr = _parseParamAddr(tokenAddr, _paramMapping[0], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[1], _subData, _returnValues);
        to = _parseParamAddr(to, _paramMapping[2], _subData, _returnValues);

        uint256 withdrawAmount = _withdraw(tokenAddr, amount, to);

        return bytes32(withdrawAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        (address tokenAddr, uint256 amount, address from) = parseInputs(_callData);

        _withdraw(tokenAddr, amount, from);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice User withdraws tokens from the DyDx protocol
    /// @param _tokenAddr The address of the token to be withdrawn
    /// @param _amount Amount of tokens to be withdrawn -> send type(uint).max for whole amount
    /// @param _to Where the withdrawn tokens will be sent
    function _withdraw(
        address _tokenAddr,
        uint256 _amount,
        address _to
    ) internal returns (uint256) {
        uint256 marketId = getMarketIdFromTokenAddress(_tokenAddr);

        // take max balance of the user
        if (_amount == type(uint256).max) {
            _amount = (getWeiBalance(address(this), 0, marketId)).value;
        }

        Account.Info[] memory accounts = new Account.Info[](1);
        accounts[0] = getAccount(address(this), 0);

        Actions.ActionArgs[] memory actions = new Actions.ActionArgs[](1);
        Types.AssetAmount memory amount =
            Types.AssetAmount({
                sign: false,
                denomination: Types.AssetDenomination.Wei,
                ref: Types.AssetReference.Delta,
                value: _amount
            });

        actions[0] = Actions.ActionArgs({
            actionType: Actions.ActionType.Withdraw,
            accountId: 0,
            amount: amount,
            primaryMarketId: marketId,
            otherAddress: address(this),
            secondaryMarketId: 0, // not used
            otherAccountId: 0, // not used
            data: "" // not used
        });

        soloMargin.operate(accounts, actions);

        _tokenAddr.withdrawTokens(_to, _amount);

        logger.Log(address(this), msg.sender, "DyDxWithdraw", abi.encode(_tokenAddr, _amount, _to));

        return _amount;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            address tokenAddr,
            uint256 amount,
            address to
        )
    {
        tokenAddr = abi.decode(_callData[0], (address));
        amount = abi.decode(_callData[1], (uint256));
        to = abi.decode(_callData[2], (address));
    }
}
