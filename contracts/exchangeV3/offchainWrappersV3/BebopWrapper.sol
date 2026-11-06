// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IOffchainWrapper } from "../../interfaces/exchange/IOffchainWrapper.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";
import { DFSWrapperHelper } from "../DFSWrapperHelper.sol";
import { DFSExchangeData } from "../DFSExchangeData.sol";
import { ReentrancyGuardTransient } from "../../_vendor/openzeppelin/ReentrancyGuardTransient.sol";

/// @title BebopWrapper
/// @notice Wrapper contract used when the off-chain exchange is Bebop.
/// @dev See IOffchainWrapper for the shared security assumptions.
contract BebopWrapper is
    IOffchainWrapper,
    DFSWrapperHelper,
    DFSExchangeData,
    AdminAuth,
    ReentrancyGuardTransient
{
    /// @notice offchainData.callData should be this struct encoded
    /// @param realCalldata The real calldata to call the Bebop exchange
    /// @param offset The offset used to slice the exact amount we are selling/buying in an order
    struct BebopCalldata {
        bytes realCalldata;
        uint256 offset;
    }

    /// @inheritdoc IOffchainWrapper
    function takeOrder(ExchangeData memory _exData)
        public
        payable
        override
        nonReentrant
        returns (bool success, uint256 tokensSwapped)
    {
        BebopCalldata memory bebopCalldata =
            abi.decode(_exData.offchainData.callData, (BebopCalldata));

        // write in the exact amount we are selling/buying in an order
        _writeUint256(bebopCalldata.realCalldata, bebopCalldata.offset, _exData.srcAmount);

        (success, tokensSwapped) = _executeOffchainSwap(_exData, bebopCalldata.realCalldata);

        // Sends leftover tokens including ETH to the caller.
        _sendLeftover(_exData.srcAddr, _exData.destAddr, payable(msg.sender));
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable { }
}
