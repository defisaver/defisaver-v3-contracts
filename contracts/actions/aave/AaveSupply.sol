// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/AaveHelper.sol";

/// @title Supply a token to an Aave market
contract AaveSupply is ActionBase, AaveHelper {
    using TokenUtils for address;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        (
            address market,
            address tokenAddr,
            uint256 amount,
            address from,
            address onBehalf,
            bool enableAsColl
        ) = parseInputs(_callData);

        market = _parseParamAddr(market, _paramMapping[0], _subData, _returnValues);
        tokenAddr = _parseParamAddr(tokenAddr, _paramMapping[1], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[2], _subData, _returnValues);
        from = _parseParamAddr(from, _paramMapping[3], _subData, _returnValues);
        onBehalf = _parseParamAddr(onBehalf, _paramMapping[4], _subData, _returnValues);

        uint256 supplyAmount = _supply(market, tokenAddr, amount, from, onBehalf, enableAsColl);

        return bytes32(supplyAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        (
            address market,
            address tokenAddr,
            uint256 amount,
            address from,
            address onBehalf,
            bool enableAsColl
        ) = parseInputs(_callData);

        _supply(market, tokenAddr, amount, from, onBehalf, enableAsColl);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice User deposits tokens to the Aave protocol
    /// @dev User needs to approve the DSProxy to pull the _tokenAddr tokens
    /// @param _market Address provider for specific market
    /// @param _tokenAddr The address of the token to be deposited
    /// @param _amount Amount of tokens to be deposited
    /// @param _from Where are we pulling the supply tokens amount from
    /// @param _onBehalf For what user we are supplying the tokens, defaults to proxy
    /// @param _enableAsColl If the supply asset should be collateral
    function _supply(
        address _market,
        address _tokenAddr,
        uint256 _amount,
        address _from,
        address _onBehalf,
        bool _enableAsColl
    ) internal returns (uint256) {
        ILendingPoolV2 lendingPool = getLendingPool(_market);

        // if amount is set to max, take the whole proxy balance
        if (_amount == type(uint256).max) {
            _amount = _tokenAddr.getBalance(address(this));
        }

        // default to onBehalf of proxy
        if (_onBehalf == address(0)) {
            _onBehalf = address(this);
        }

        // pull tokens to proxy so we can supply
        _tokenAddr.pullTokens(_from, _amount);

        // approve aave pool to pull tokens
        _tokenAddr.approveToken(address(lendingPool), _amount);

        // deposit in behalf of the proxy
        lendingPool.deposit(_tokenAddr, _amount, _onBehalf, AAVE_REFERRAL_CODE);

        if (_enableAsColl) {
            enableAsCollateral(_market, _tokenAddr, true);
        }

        logger.Log(
            address(this),
            msg.sender,
            "AaveSupply",
            abi.encode(_market, _tokenAddr, _amount, _from, _onBehalf, _enableAsColl)
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
            address from,
            address onBehalf,
            bool enableAsColl
        )
    {
        market = abi.decode(_callData[0], (address));
        tokenAddr = abi.decode(_callData[1], (address));
        amount = abi.decode(_callData[2], (uint256));
        from = abi.decode(_callData[3], (address));
        onBehalf = abi.decode(_callData[4], (address));
        enableAsColl = abi.decode(_callData[5], (bool));
    }
}
