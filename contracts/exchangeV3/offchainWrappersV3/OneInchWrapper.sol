// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IOffchainWrapper } from "../../interfaces/exchange/IOffchainWrapper.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";
import { DFSWrapperHelper } from "../DFSWrapperHelper.sol";
import { DFSExchangeData } from "../DFSExchangeData.sol";
import { ReentrancyGuardTransient } from "../../_vendor/openzeppelin/ReentrancyGuardTransient.sol";

/// @title OneInchWrapper
/// @notice Wrapper contract used when the off-chain exchange is 1inch.
/// @dev See IOffchainWrapper for the shared security assumptions.
contract OneInchWrapper is
    IOffchainWrapper,
    DFSWrapperHelper,
    DFSExchangeData,
    AdminAuth,
    ReentrancyGuardTransient
{
    /// @notice offchainData.callData should be this struct encoded
    /// @param realCalldata The real calldata to call the 1inch exchange
    /// @param offsets The offsets used to slice the exact amount we are selling/buying in an order
    struct OneInchCalldata {
        bytes realCalldata;
        uint256[] offsets;
    }

    /// @inheritdoc IOffchainWrapper
    function takeOrder(ExchangeData memory _exData)
        public
        payable
        override
        nonReentrant
        returns (bool success, uint256 tokensSwapped)
    {
        OneInchCalldata memory oneInchCalldata =
            abi.decode(_exData.offchainData.callData, (OneInchCalldata));

        // write in the exact amount we are selling/buying in an order
        for (uint256 i; i < oneInchCalldata.offsets.length; i++) {
            _writeUint256(
                oneInchCalldata.realCalldata, oneInchCalldata.offsets[i], _exData.srcAmount
            );
        }

        (success, tokensSwapped) = _executeOffchainSwap(_exData, oneInchCalldata.realCalldata);

        // Sends leftover tokens including ETH to the caller.
        _sendLeftover(_exData.srcAddr, _exData.destAddr, payable(msg.sender));
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable { }
}
