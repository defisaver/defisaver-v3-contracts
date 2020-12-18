// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/aave/ILendingPoolAddressesProvider.sol";
import "../../interfaces/aave/ILendingPool.sol";
import "../../utils/GasBurner.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";

/// @title Payback a token a user borrowed from an Aave market
contract AavePaybackV1 is ActionBase, TokenUtils, GasBurner {

    address public constant AAVE_V1_LENDING_POOL_ADDRESSES = 0x24a42fD28C976A61Df5D00D0599C34c4f90748c8;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        (address tokenAddr, uint256 amount, address from) = parseInputs(_callData);

        tokenAddr = _parseParamAddr(tokenAddr, _paramMapping[0], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[1], _subData, _returnValues);
        from = _parseParamAddr(from, _paramMapping[2], _subData, _returnValues);

        uint256 paybackAmount = _payback(tokenAddr, amount, from);

        return bytes32(paybackAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public override payable burnGas {
        (address tokenAddr, uint256 amount, address from) = parseInputs(_callData);

        _payback(tokenAddr, amount, from);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////


     /// @dev User needs to approve the DSProxy to pull the _tokenAddr tokens
    /// @notice User paybacks tokens to the Aave protocol
    /// @param _tokenAddr The address of the token to be paybacked
    /// @param _amount Amount of tokens to be payed back, send uint256(-1) for whole debt
    /// @param _from Address from which we pull token
    function _payback(address _tokenAddr, uint256 _amount, address _from) internal returns (uint) {
        address lendingPoolCore = ILendingPoolAddressesProvider(AAVE_V1_LENDING_POOL_ADDRESSES).getLendingPoolCore();
        address lendingPool = ILendingPoolAddressesProvider(AAVE_V1_LENDING_POOL_ADDRESSES).getLendingPool();

        uint256 amount = _amount;
        uint256 ethAmount = getBalance(ETH_ADDR, address(this));

        if (_amount == uint256(-1)) {
            (,uint256 borrowAmount,,,,,uint256 originationFee,,,) = ILendingPool(lendingPool).getUserReserveData(_tokenAddr, address(this));
            amount = borrowAmount + originationFee;
            amount = amount > getBalance(_tokenAddr, msg.sender) ? getBalance(_tokenAddr, msg.sender) : amount;
        }

        if (_tokenAddr != ETH_ADDR) {
            pullTokens(_tokenAddr, _from, _amount);
            approveToken(_tokenAddr, lendingPoolCore, uint(-1));
            ethAmount = 0;
        }

        uint tokensBefore = getBalance(_tokenAddr, address(this));
        ILendingPool(lendingPool).repay{value: ethAmount}(_tokenAddr, amount, payable(address(this)));
        uint tokensAfter = getBalance(_tokenAddr, address(this));

        withdrawTokens(_tokenAddr, _from, tokensAfter);
        
        return tokensBefore - tokensAfter;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            address tokenAddr,
            uint amount,
            address from
        )
    {
        tokenAddr = abi.decode(_callData[0], (address));
        amount = abi.decode(_callData[1], (uint256));
        from = abi.decode(_callData[2], (address));
    }
}
