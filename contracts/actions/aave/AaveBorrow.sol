// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/AaveHelper.sol";

/// @title Borrow a token a from an Aave market
contract AaveBorrow is ActionBase, AaveHelper {

    using TokenUtils for address;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        (
            address market,
            address tokenAddr,
            uint256 amount,
            uint256 rateMode,
            address to,
            address onBehalf
        ) = parseInputs(_callData);

        market = _parseParamAddr(market, _paramMapping[0], _subData, _returnValues);
        tokenAddr = _parseParamAddr(tokenAddr, _paramMapping[1], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[2], _subData, _returnValues);
        rateMode = _parseParamUint(rateMode, _paramMapping[3], _subData, _returnValues);
        to = _parseParamAddr(to, _paramMapping[4], _subData, _returnValues);
        onBehalf = _parseParamAddr(onBehalf, _paramMapping[5], _subData, _returnValues);

        uint256 borrowAmount = _borrow(market, tokenAddr, amount, rateMode, to, onBehalf);

        return bytes32(borrowAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public override payable {
        (
            address market,
            address tokenAddr,
            uint256 amount,
            uint256 rateMode,
            address to,
            address onBehalf
        ) = parseInputs(_callData);

        _borrow(market, tokenAddr, amount, rateMode, to, onBehalf);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////


    /// @notice User borrows tokens to the Aave protocol
    /// @param _market address provider for specific market
    /// @param _tokenAddr The address of the token to be borrowed
    /// @param _amount Amount of tokens to be borrowed
    /// @param _rateMode Send 1 for stable rate and 2 for variable
    /// @param _onBehalf From what user we are borrow the tokens, defaults to proxy
    function _borrow(
        address _market,
        address _tokenAddr,
        uint256 _amount,
        uint256 _rateMode,
        address _to,
        address _onBehalf
    ) internal returns (uint) {
        address lendingPool = ILendingPoolAddressesProviderV2(_market).getLendingPool();

        // default to onBehalf of proxy
        if (_onBehalf == address(0)) {
            _onBehalf = address(this);
        }

        ILendingPoolV2(lendingPool).borrow(
            _tokenAddr,
            _amount,
            _rateMode,
            AAVE_REFERRAL_CODE,
            _onBehalf
        );

        _tokenAddr.withdrawTokens(_to, _amount);

        return _amount;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            address market,
            address tokenAddr,
            uint256 amount,
            uint256 rateMode,
            address to,
            address onBehalf
        )
    {
        market = abi.decode(_callData[0], (address));
        tokenAddr = abi.decode(_callData[1], (address));
        amount = abi.decode(_callData[2], (uint256));
        rateMode = abi.decode(_callData[3], (uint256));
        to = abi.decode(_callData[4], (address));
        onBehalf = abi.decode(_callData[5], (address));
    }

}
