// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import {IERC20} from '../IERC20.sol';
import {IAggregationExecutor} from './IAggregationExecutor.sol';

interface IMetaAggregationRouterV2 {
  struct SwapDescriptionV2 {
    IERC20 srcToken;
    IERC20 dstToken;
    address[] srcReceivers; // transfer src token to these addresses, default
    uint256[] srcAmounts;
    address[] feeReceivers;
    uint256[] feeAmounts;
    address dstReceiver;
    uint256 amount;
    uint256 minReturnAmount;
    uint256 flags;
    bytes permit;
  }

  /// @dev  use for swapGeneric and swap to avoid stack too deep
  struct SwapExecutionParams {
    address callTarget; // call this address
    address approveTarget; // approve this address if _APPROVE_FUND set
    bytes targetData;
    SwapDescriptionV2 desc;
    bytes clientData;
  }

  function swap(SwapExecutionParams calldata execution) external payable returns (uint256, uint256);

  function swapSimpleMode(
    IAggregationExecutor caller,
    SwapDescriptionV2 memory desc,
    bytes calldata executorData,
    bytes calldata clientData
  ) external returns (uint256, uint256);
}