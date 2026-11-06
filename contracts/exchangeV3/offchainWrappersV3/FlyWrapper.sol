// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IOffchainWrapper } from "../../interfaces/exchange/IOffchainWrapper.sol";
import { IFlyDexAggregator } from "../../interfaces/exchange/IFlyDexAggregator.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";
import { DFSWrapperHelper } from "../DFSWrapperHelper.sol";
import { DFSExchangeData } from "../DFSExchangeData.sol";
import { ReentrancyGuardTransient } from "../../_vendor/openzeppelin/ReentrancyGuardTransient.sol";

/// @title FlyWrapper
/// @notice Wrapper contract used when the off-chain exchange is the Fly DEX aggregator.
/// @dev See IOffchainWrapper for the shared security assumptions.
contract FlyWrapper is
    IOffchainWrapper,
    DFSWrapperHelper,
    DFSExchangeData,
    AdminAuth,
    ReentrancyGuardTransient
{
    /// @inheritdoc IOffchainWrapper
    function takeOrder(ExchangeData memory _exData)
        public
        payable
        override
        nonReentrant
        returns (bool success, uint256 tokensSwapped)
    {
        bytes memory realCalldata = IFlyDexAggregator(_exData.offchainData.exchangeAddr)
            .updateAmountIn(_exData.offchainData.callData, _exData.srcAmount);

        (success, tokensSwapped) = _executeOffchainSwap(_exData, realCalldata);

        // Sends leftover tokens including ETH to the caller.
        _sendLeftover(_exData.srcAddr, _exData.destAddr, payable(msg.sender));
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable { }
}
