// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

interface IAggregationExecutor {
  function callBytes(bytes calldata data) external payable; // 0xd9c45357

  // callbytes per swap sequence
  function swapSingleSequence(bytes calldata data) external;

  function finalTransactionProcessing(
    address tokenIn,
    address tokenOut,
    address to,
    bytes calldata destTokenFeeData
  ) external;
}