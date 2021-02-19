// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../utils/GasBurner.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/AaveHelper.sol";

/// @title Suply a token to an Aave market
contract AaveSupply is ActionBase, AaveHelper, GasBurner {

    using TokenUtils for address;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        (address market, address tokenAddr, uint256 amount, address from, address onBehalf) =
            parseInputs(_callData);

        market = _parseParamAddr(market, _paramMapping[0], _subData, _returnValues);
        tokenAddr = _parseParamAddr(tokenAddr, _paramMapping[1], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[2], _subData, _returnValues);
        from = _parseParamAddr(from, _paramMapping[3], _subData, _returnValues);
        onBehalf = _parseParamAddr(onBehalf, _paramMapping[4], _subData, _returnValues);

        uint256 supplyAmount = _supply(market, tokenAddr, amount, from, onBehalf);

        return bytes32(supplyAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override burnGas {
        (address market, address tokenAddr, uint256 amount, address from, address onBehalf) =
            parseInputs(_callData);

        _supply(market, tokenAddr, amount, from, onBehalf);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice User deposits tokens to the Aave protocol
    /// @dev User needs to approve the DSProxy to pull the _tokenAddr tokens
    /// @param _market address provider for specific market
    /// @param _tokenAddr The address of the token to be deposited
    /// @param _amount Amount of tokens to be deposited
    /// @param _onBehalf For what user we are supplying the tokens, defaults to proxy
    function _supply(
        address _market,
        address _tokenAddr,
        uint256 _amount,
        address _from,
        address _onBehalf
    ) internal returns (uint256) {
        address lendingPool = ILendingPoolAddressesProviderV2(_market).getLendingPool();
        uint256 amount = _amount;

        if (_amount == type(uint256).max) {
            amount = _tokenAddr.getBalance(_tokenAddr == TokenUtils.ETH_ADDR ? address(this) : _from);
        }

        // default to onBehalf of proxy
        if (_onBehalf == address(0)) {
            _onBehalf = address(this);
        }

        // pull tokens to proxy so we can supply
        _tokenAddr.pullTokens(_from, amount);

        // if Eth, convert to Weth
        _tokenAddr = _tokenAddr.convertAndDepositToWeth(amount);

        // approve aave pool to pull tokens
        _tokenAddr.approveToken(lendingPool, type(uint256).max);

        // deposit in behalf of the proxy
        ILendingPoolV2(lendingPool).deposit(_tokenAddr, amount, _onBehalf, AAVE_REFERRAL_CODE);

        // always set as collateral if not already
        if (!isTokenUsedAsColl(_market, _tokenAddr)) {
            setCollStateForToken(_market, _tokenAddr, true);
        }

        return amount;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            address market,
            address tokenAddr,
            uint256 amount,
            address from,
            address onBehalf
        )
    {
        market = abi.decode(_callData[0], (address));
        tokenAddr = abi.decode(_callData[1], (address));
        amount = abi.decode(_callData[2], (uint256));
        from = abi.decode(_callData[3], (address));
        onBehalf = abi.decode(_callData[4], (address));
    }
}
