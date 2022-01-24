// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/DyDxHelper.sol";

/// @title Supply tokens to Dydx
contract DyDxSupply is ActionBase, DyDxHelper {
    using TokenUtils for address;

    struct Params {
        address tokenAddr;
        uint256 amount;
        address from;
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
        params.from = _parseParamAddr(params.from, _paramMapping[2], _subData, _returnValues);

        (uint256 suppliedAmount, bytes memory logData) = _supply(params.tokenAddr, params.amount, params.from);
        emit ActionEvent("DyDxSupply", logData);
        return bytes32(suppliedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _supply(params.tokenAddr, params.amount, params.from);
        logger.logActionDirectEvent("DyDxSupply", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice User deposits tokens to the DyDx protocol
    /// @dev User needs to approve the DSProxy to pull the _tokenAddr tokens
    /// @param _tokenAddr The address of the token to be deposited
    /// @param _amount Amount of tokens to be deposited
    /// @param _from Where are we pulling the supply tokens amount from
    function _supply(
        address _tokenAddr,
        uint256 _amount,
        address _from
    ) internal returns (uint256, bytes memory) {

        // if amount is set to max, take the whole _from balance
        if (_amount == type(uint256).max) {
            _amount = _tokenAddr.getBalance(_from);
        }

        _tokenAddr.pullTokensIfNeeded(_from, _amount);
        _tokenAddr.approveToken(address(soloMargin), _amount);

        uint marketId = getMarketIdFromTokenAddress(_tokenAddr);

        Account.Info[] memory accounts = new Account.Info[](1);
        accounts[0] = getAccount(address(this), 0);

        Actions.ActionArgs[] memory actions = new Actions.ActionArgs[](1);
        Types.AssetAmount memory amount = Types.AssetAmount({
            sign: true,
            denomination: Types.AssetDenomination.Wei,
            ref: Types.AssetReference.Delta,
            value: _amount
        });

        actions[0] = Actions.ActionArgs({
            actionType: Actions.ActionType.Deposit,
            accountId: 0,
            amount: amount,
            primaryMarketId: marketId,
            otherAddress: address(this),
            secondaryMarketId: 0, //not used
            otherAccountId: 0, //not used
            data: "" //not used
        });

        soloMargin.operate(accounts, actions);

        bytes memory logData = abi.encode(_tokenAddr, _amount, _from);
        return (_amount, logData);
    }

  function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}