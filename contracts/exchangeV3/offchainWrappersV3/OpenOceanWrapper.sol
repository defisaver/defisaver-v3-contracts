// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IOffchainWrapper } from "../../interfaces/exchange/IOffchainWrapper.sol";
import { AdminAuth } from "../../auth/AdminAuth.sol";
import { DFSWrapperHelper } from "../DFSWrapperHelper.sol";
import { DFSExchangeData } from "../DFSExchangeData.sol";
import { ReentrancyGuardTransient } from "../../_vendor/openzeppelin/ReentrancyGuardTransient.sol";

/// @title OpenOceanWrapper
/// @notice Wrapper contract used when the off-chain exchange is OpenOcean.
/// @dev See IOffchainWrapper for the shared security assumptions.
contract OpenOceanWrapper is
    IOffchainWrapper,
    DFSWrapperHelper,
    DFSExchangeData,
    AdminAuth,
    ReentrancyGuardTransient
{
    /// @notice offchainData.callData should be this struct encoded
    /// @param realCalldata Calldata forwarded to the OpenOcean exchange
    /// @param offset Byte offset in realCalldata where the source amount is written
    struct OpenOceanCalldata {
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
        OpenOceanCalldata memory openOceanCalldata =
            abi.decode(_exData.offchainData.callData, (OpenOceanCalldata));

        // write in the exact amount we are selling/buying in an order
        _writeUint256(openOceanCalldata.realCalldata, openOceanCalldata.offset, _exData.srcAmount);

        (success, tokensSwapped) = _executeOffchainSwap(_exData, openOceanCalldata.realCalldata);

        // Sends leftover tokens including ETH to the caller.
        _sendLeftover(_exData.srcAddr, _exData.destAddr, payable(msg.sender));
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable { }
}
