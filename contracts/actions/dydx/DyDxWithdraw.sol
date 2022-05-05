// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../interfaces/IWETH.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/DyDxHelper.sol";

/// @title Withdraw tokens from DyDx
contract DyDxWithdraw is ActionBase, DyDxHelper {
    using TokenUtils for address;

    struct Params {
        address tokenAddr;
        uint256 amount;
        address to;
    }

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
        params.to = _parseParamAddr(params.to, _paramMapping[2], _subData, _returnValues);

        (uint256 withdrawnAmount, bytes memory logData) = _withdraw(params.tokenAddr, params.amount, params.to);
        emit ActionEvent("DyDxWithdraw", logData);
        return bytes32(withdrawnAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _withdraw(params.tokenAddr, params.amount, params.to);
        logger.logActionDirectEvent("DyDxWithdraw", logData);
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
    ) internal returns (uint256, bytes memory) {
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

        bytes memory logData = abi.encode(_tokenAddr, _amount, _to);
        return (_amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
