// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IOffchainWrapper } from "../../interfaces/exchange/IOffchainWrapper.sol";
import { IKyberScaleHelper } from "../../interfaces/exchange/IKyberScaleHelper.sol";
import { IDFSRegistry } from "../../interfaces/core/IDFSRegistry.sol";

import { AdminAuth } from "../../auth/AdminAuth.sol";
import { DFSWrapperHelper } from "../DFSWrapperHelper.sol";
import { DFSExchangeData } from "../DFSExchangeData.sol";
import { CoreHelper } from "../../core/helpers/CoreHelper.sol";
import { ReentrancyGuardTransient } from "../../_vendor/openzeppelin/ReentrancyGuardTransient.sol";
import { DFSIds } from "../../utils/DFSIds.sol";

/// @title KyberAggregatorWrapper
/// @notice Wrapper contract used when the off-chain exchange is KyberSwap Aggregator.
/// @dev See IOffchainWrapper for the shared security assumptions.
contract KyberAggregatorWrapper is
    IOffchainWrapper,
    DFSWrapperHelper,
    DFSExchangeData,
    AdminAuth,
    CoreHelper,
    ReentrancyGuardTransient
{
    IDFSRegistry public constant registry = IDFSRegistry(REGISTRY_ADDR);

    /// @inheritdoc IOffchainWrapper
    function takeOrder(ExchangeData memory _exData)
        public
        payable
        override
        nonReentrant
        returns (bool success, uint256 tokensSwapped)
    {
        address scalingHelperAddr = registry.getAddr(DFSIds.KYBER_SCALING_HELPER);
        (bool isScalingSuccess, bytes memory scaledCalldata) = IKyberScaleHelper(scalingHelperAddr)
            .getScaledInputData(_exData.offchainData.callData, _exData.srcAmount);

        if (!isScalingSuccess) {
            // Sends leftover tokens including ETH to the caller.
            _sendLeftover(_exData.srcAddr, _exData.destAddr, payable(msg.sender));
            return (false, 0);
        }

        (success, tokensSwapped) = _executeOffchainSwap(_exData, scaledCalldata);

        // Sends leftover tokens including ETH to the caller.
        _sendLeftover(_exData.srcAddr, _exData.destAddr, payable(msg.sender));
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable { }
}
