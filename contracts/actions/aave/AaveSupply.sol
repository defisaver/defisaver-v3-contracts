// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../utils/GasBurner.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/AaveHelper.sol";

/// @title Suply a token to an Aave market
contract AaveSupply is ActionBase, AaveHelper, TokenUtils, GasBurner {

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        (address market, address tokenAddr, uint256 amount, address from) = parseInputs(_callData);

        market = _parseParamAddr(market, _paramMapping[0], _subData, _returnValues);
        tokenAddr = _parseParamAddr(tokenAddr, _paramMapping[1], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[2], _subData, _returnValues);
        from = _parseParamAddr(from, _paramMapping[3], _subData, _returnValues);

        uint256 supplyAmount = _supply(market, tokenAddr, amount, from);

        return bytes32(supplyAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public override payable burnGas {
        (address market, address tokenAddr, uint256 amount, address from) = parseInputs(_callData);

        _supply(market, tokenAddr, amount, from);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////


    /// @notice User deposits tokens to the Aave protocol
    /// @dev User needs to approve the DSProxy to pull the _tokenAddr tokens
    /// @param _market address provider for specific market
    /// @param _tokenAddr The address of the token to be deposited
    /// @param _amount Amount of tokens to be deposited
    function _supply(
        address _market,
        address _tokenAddr,
        uint256 _amount,
        address _from
    ) internal returns (uint) {
        address lendingPool = ILendingPoolAddressesProviderV2(_market).getLendingPool();

        // pull tokens to proxy so we can supply
        pullTokens(_tokenAddr, _from, _amount);

        // if Eth, convert to Weth
        _tokenAddr = convertAndDepositToWeth(_tokenAddr, _amount);

        // approve aave pool to pull tokens
        approveToken(_tokenAddr, lendingPool, _amount);

        // deposit in behalf of the proxy
        ILendingPoolV2(lendingPool).deposit(_tokenAddr, _amount, address(this), AAVE_REFERRAL_CODE);

        // always set as collateral if not already
        if (!isTokenUsedAsColl(_market, _tokenAddr)) {
            setCollStateForToken(_market, _tokenAddr, true);
        }

        return _amount;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            address market,
            address tokenAddr,
            uint256 amount,
            address from
        )
    {
        market = abi.decode(_callData[0], (address));
        tokenAddr = abi.decode(_callData[1], (address));
        amount = abi.decode(_callData[2], (uint256));
        from = abi.decode(_callData[3], (address));
    }
}
