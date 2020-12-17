// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/IWETH.sol";
import "../../utils/GasBurner.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/AaveHelper.sol";

/// @title Payback a token a user borrowed from an Aave market
contract AavePayback is ActionBase, AaveHelper, TokenUtils, GasBurner {

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        (address market, address tokenAddr, uint256 amount, uint rateMode, address from) = parseInputs(_callData);

        market = _parseParamAddr(market, _paramMapping[0], _subData, _returnValues);
        tokenAddr = _parseParamAddr(tokenAddr, _paramMapping[1], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[2], _subData, _returnValues);
        rateMode = _parseParamUint(rateMode, _paramMapping[3], _subData, _returnValues);
        from = _parseParamAddr(from, _paramMapping[4], _subData, _returnValues);

        uint256 paybackAmount = _payback(market, tokenAddr, amount, rateMode, from);

        return bytes32(paybackAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public override payable burnGas {
        (address market, address tokenAddr, uint256 amount, uint rateMode, address from) = parseInputs(_callData);

        _payback(market, tokenAddr, amount, rateMode, from);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////


     /// @dev User needs to approve the DSProxy to pull the _tokenAddr tokens
    /// @notice User paybacks tokens to the Aave protocol
    /// @param _market address provider for specific market
    /// @param _tokenAddr The address of the token to be paybacked
    /// @param _amount Amount of tokens to be payed back
    /// @param _rateMode a
    /// @param _from a
    function _payback(address _market, address _tokenAddr, uint256 _amount, uint256 _rateMode, address _from) internal returns (uint) {
        address lendingPool = ILendingPoolAddressesProviderV2(_market).getLendingPool();

        // if the amount sent is -1 to repay all, pull only the msg.sender baalnce
        if (_amount == uint(-1)) {
            _amount = getBalance(_tokenAddr, msg.sender);
        }


        pullTokens(_tokenAddr, _from, _amount);

        _tokenAddr = convertAndDepositToWeth(_tokenAddr, _amount);

        approveToken(_tokenAddr, lendingPool, uint(-1));

        uint tokensBefore = getBalance(_tokenAddr, address(this));

        ILendingPoolV2(lendingPool).repay(_tokenAddr, _amount, _rateMode, payable(address(this)));

        uint tokensAfter = getBalance(_tokenAddr, address(this));

        // withraw weth if needed
        if (_tokenAddr == WETH_ADDR) {
            withdrawWeth(tokensAfter);
            _tokenAddr = ETH_ADDR;
        }

        withdrawTokens(_tokenAddr, _from, tokensAfter);

        return tokensBefore - tokensAfter;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            address market,
            address tokenAddr,
            uint amount,
            uint rateMode,
            address from
        )
    {
        market = abi.decode(_callData[0], (address));
        tokenAddr = abi.decode(_callData[1], (address));
        amount = abi.decode(_callData[2], (uint256));
        rateMode = abi.decode(_callData[3], (uint256));
        from = abi.decode(_callData[4], (address));
    }
}
