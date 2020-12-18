// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "../../interfaces/aave/IAToken.sol";
import "../../interfaces/aave/ILendingPoolAddressesProvider.sol";
import "../../interfaces/aave/ILendingPool.sol";
import "../../utils/GasBurner.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";

/// @title Withdraw a token from an AaveV1
contract AaveWithdrawV1 is ActionBase, TokenUtils, GasBurner {

    address public constant AAVE_V1_LENDING_POOL_ADDRESSES = 0x24a42fD28C976A61Df5D00D0599C34c4f90748c8;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        (address tokenAddr, uint256 amount, address to) = parseInputs(_callData);

        tokenAddr = _parseParamAddr(tokenAddr, _paramMapping[0], _subData, _returnValues);
        amount = _parseParamUint(amount, _paramMapping[1], _subData, _returnValues);
        to = _parseParamAddr(to, _paramMapping[2], _subData, _returnValues);

        uint256 withdrawAmount = _withdraw(tokenAddr, amount, to);

        return bytes32(withdrawAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public override payable burnGas {
        (address tokenAddr, uint256 amount, address to) = parseInputs(_callData);

        _withdraw(tokenAddr, amount, to);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }


    //////////////////////////// ACTION LOGIC ////////////////////////////


    /// @notice User withdraws tokens from the Aave protocol
    /// @param _tokenAddr The address of the token to be withdrawn
    /// @param _amount Amount of tokens to be withdrawn -> send -1 for whole amount
    /// @param _to Where the withdrawn tokens will be sent
    function _withdraw(address _tokenAddr, uint256 _amount, address _to) internal returns (uint) {
        address lendingPoolCore = ILendingPoolAddressesProvider(AAVE_V1_LENDING_POOL_ADDRESSES).getLendingPoolCore();
        address aTokenAddr = ILendingPool(lendingPoolCore).getReserveATokenAddress(_tokenAddr);

        uint256 amount = _amount;

        if (_amount == uint256(-1)) {
            amount = getBalance(aTokenAddr, address(this));
        }

        IAToken(aTokenAddr).redeem(amount);

        withdrawTokens(_tokenAddr, _to, _amount);

        return amount;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            address tokenAddr,
            uint256 amount,
            address to
        )
    {
        tokenAddr = abi.decode(_callData[0], (address));
        amount = abi.decode(_callData[1], (uint256));
        to = abi.decode(_callData[2], (address));
    }
}