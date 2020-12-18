// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/IWETH.sol";
import "../../utils/GasBurner.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/AaveHelper.sol";

/// @title Withdraw a token from an Aave market
contract AaveWithdraw is ActionBase, AaveHelper, TokenUtils, GasBurner {

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        (address market, address tokenAddr, uint256 amount, address to) = parseInputs(_callData);

        market = _parseParamAddr(market, _paramMapping[0], _subData, _returnValues);
        tokenAddr = _parseParamAddr(tokenAddr, _paramMapping[1], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[2], _subData, _returnValues);
        to = _parseParamAddr(to, _paramMapping[3], _subData, _returnValues);

        uint256 withdrawAmount = _withdraw(market, tokenAddr, amount, to);

        return bytes32(withdrawAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public override payable burnGas {
        (address market, address tokenAddr, uint256 amount, address from) = parseInputs(_callData);

        _withdraw(market, tokenAddr, amount, from);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }


    //////////////////////////// ACTION LOGIC ////////////////////////////


    /// @notice User withdraws tokens from the Aave protocol
    /// @param _market address provider for specific market
    /// @param _tokenAddr The address of the token to be withdrawn
    /// @param _amount Amount of tokens to be withdrawn -> send -1 for whole amount
    /// @param _to Where the withdrawn tokens will be sent
    function _withdraw(address _market, address _tokenAddr, uint256 _amount, address _to) internal returns (uint) {
        address lendingPool = ILendingPoolAddressesProviderV2(_market).getLendingPool();
        _tokenAddr = convertToWeth(_tokenAddr);

        if (_tokenAddr == WETH_ADDR) {
            // if weth, pull to proxy and return ETH to user
            ILendingPoolV2(lendingPool).withdraw(_tokenAddr, _amount, address(this));

            // needs to use balance of in case that amount is -1 for whole debt
            uint wethBalance = getBalance(WETH_ADDR, address(this));
            withdrawWeth(wethBalance);
            _amount = wethBalance;

            payable(_to).transfer(_amount);
        } else {
            // if not eth send directly to _to
            ILendingPoolV2(lendingPool).withdraw(_tokenAddr, _amount, _to);
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
            address to
        )
    {
        market = abi.decode(_callData[0], (address));
        tokenAddr = abi.decode(_callData[1], (address));
        amount = abi.decode(_callData[2], (uint256));
        to = abi.decode(_callData[3], (address));
    }
}