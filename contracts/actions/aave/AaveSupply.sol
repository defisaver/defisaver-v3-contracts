// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { TokenUtils } from "../../utils/TokenUtils.sol";
import { ActionBase } from "../ActionBase.sol";
import { AaveHelper } from "./helpers/AaveHelper.sol";
import { ILendingPoolV2 } from "../../interfaces/aaveV2/ILendingPoolV2.sol";

/// @title Supply a token to an Aave market
contract AaveSupply is ActionBase, AaveHelper {
    using TokenUtils for address;

    /// @param market Aave Market address.
    /// @param tokenAddr Token address.
    /// @param amount Amount of tokens to supply.
    /// @param from Address to send the supply tokens from.
    /// @param onBehalf Address to send the supply tokens on behalf of. Defaults to the user's wallet.
    /// @param enableAsColl Whether to enable the token as collateral.
    struct Params {
        address market;
        address tokenAddr;
        uint256 amount;
        address from;
        address onBehalf;
        bool enableAsColl;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.market = _parseParamAddr(params.market, _paramMapping[0], _subData, _returnValues);
        params.tokenAddr = _parseParamAddr(params.tokenAddr, _paramMapping[1], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[2], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[3], _subData, _returnValues);
        params.onBehalf = _parseParamAddr(params.onBehalf, _paramMapping[4], _subData, _returnValues);
        params.enableAsColl = _parseParamUint(params.enableAsColl ? 1 : 0, _paramMapping[5], _subData, _returnValues) == 1;

        (uint256 supplyAmount, bytes memory logData) = _supply(params.market, params.tokenAddr, params.amount, params.from, params.onBehalf, params.enableAsColl);
        emit ActionEvent("AaveSupply", logData);
        return bytes32(supplyAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _supply(params.market, params.tokenAddr, params.amount, params.from, params.onBehalf, params.enableAsColl);
        logger.logActionDirectEvent("AaveSupply", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice User deposits tokens to the Aave protocol.
    /// @notice User needs to approve its wallet to pull the _tokenAddr tokens.
    /// @param _market Address provider for specific market.
    /// @param _tokenAddr The address of the token to be deposited.
    /// @param _amount Amount of tokens to be deposited.
    /// @param _from Where are we pulling the supply tokens amount from.
    /// @param _onBehalf For what user we are supplying the tokens, defaults to user's wallet.
    /// @param _enableAsColl If the supply asset should be collateral.
    function _supply(
        address _market,
        address _tokenAddr,
        uint256 _amount,
        address _from,
        address _onBehalf,
        bool _enableAsColl
    ) internal returns (uint256, bytes memory) {
        ILendingPoolV2 lendingPool = getLendingPool(_market);

        // if amount is set to max, take the whole _from balance
        if (_amount == type(uint256).max) {
            _amount = _tokenAddr.getBalance(_from);
        }

        // default to onBehalf of user's wallet
        if (_onBehalf == address(0)) {
            _onBehalf = address(this);
        }

        // pull tokens to user's wallet so we can supply
        _tokenAddr.pullTokensIfNeeded(_from, _amount);

        // approve aave pool to pull tokens
        _tokenAddr.approveToken(address(lendingPool), _amount);

        // deposit in behalf of the user's wallet
        lendingPool.deposit(_tokenAddr, _amount, _onBehalf, AAVE_REFERRAL_CODE);

        if (_enableAsColl) {
            enableAsCollateral(_market, _tokenAddr, true);
        }

        bytes memory logData = abi.encode(
            _market,
            _tokenAddr,
            _amount,
            _from,
            _onBehalf,
            _enableAsColl
        );
        return (_amount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
