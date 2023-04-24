// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

interface IExecutorHelper {
  struct Swap {
    bytes data;
    bytes4 functionSelector;
  }

  struct SwapExecutorDescription {
    Swap[][] swapSequences;
    address tokenIn;
    address tokenOut;
    uint256 minTotalAmountOut;
    address to;
    uint256 deadline;
    bytes destTokenFeeData;
  }

  struct UniSwap {
    address pool;
    address tokenIn;
    address tokenOut;
    address recipient;
    uint256 collectAmount; // amount that should be transferred to the pool
    uint256 limitReturnAmount;
    uint32 swapFee;
    uint32 feePrecision;
    uint32 tokenWeightInput;
  }

  struct StableSwap {
    address pool;
    address tokenFrom;
    address tokenTo;
    uint8 tokenIndexFrom;
    uint8 tokenIndexTo;
    uint256 dx;
    uint256 minDy;
    uint256 poolLength;
    address poolLp;
    bool isSaddle; // true: saddle, false: stable
  }

  struct CurveSwap {
    address pool;
    address tokenFrom;
    address tokenTo;
    int128 tokenIndexFrom;
    int128 tokenIndexTo;
    uint256 dx;
    uint256 minDy;
    bool usePoolUnderlying;
    bool useTriCrypto;
  }

  struct UniSwapV3ProMM {
    address recipient;
    address pool;
    address tokenIn;
    address tokenOut;
    uint256 swapAmount;
    uint256 limitReturnAmount;
    uint160 sqrtPriceLimitX96;
    bool isUniV3; // true = UniV3, false = ProMM
  }

  struct BalancerV2 {
    address vault;
    bytes32 poolId;
    address assetIn;
    address assetOut;
    uint256 amount;
    uint256 limit;
  }

  struct DODO {
    address recipient;
    address pool;
    address tokenFrom;
    address tokenTo;
    uint256 amount;
    uint256 minReceiveQuote;
    address sellHelper;
    bool isSellBase;
    bool isVersion2;
  }

  struct GMX {
    address vault;
    address tokenIn;
    address tokenOut;
    uint256 amount;
    uint256 minOut;
    address receiver;
  }

  struct Synthetix {
    address synthetixProxy;
    address tokenIn;
    address tokenOut;
    bytes32 sourceCurrencyKey;
    uint256 sourceAmount;
    bytes32 destinationCurrencyKey;
    uint256 minAmount;
    bool useAtomicExchange;
  }

  struct Platypus {
    address pool;
    address tokenIn;
    address tokenOut;
    address recipient;
    uint256 collectAmount; // amount that should be transferred to the pool
    uint256 limitReturnAmount;
  }

  struct PSM {
    address router;
    address tokenIn;
    address tokenOut;
    uint256 amountIn;
    address recipient;
  }

  struct WSTETH {
    address pool;
    uint256 amount;
    bool isWrapping;
  }

  function executeUniSwap(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut
  ) external payable returns (uint256);

  function executeStableSwap(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut
  ) external payable returns (uint256);

  function executeCurveSwap(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut
  ) external payable returns (uint256);

  function executeKyberDMMSwap(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut
  ) external payable returns (uint256);

  function executeUniV3ProMMSwap(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut
  ) external payable returns (uint256);

  function executeRfqSwap(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut
  ) external payable returns (uint256);

  function executeBalV2Swap(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut
  ) external payable returns (uint256);

  function executeDODOSwap(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut
  ) external payable returns (uint256);

  function executeVelodromeSwap(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut
  ) external payable returns (uint256);

  function executeGMXSwap(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut
  ) external payable returns (uint256);

  function executePlatypusSwap(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut
  ) external payable returns (uint256);

  function executeWrappedstETHSwap(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut
  ) external payable returns (uint256);

  function executeSynthetixSwap(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut
  ) external payable returns (uint256);

  function executeHashflowSwap(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut
  ) external payable returns (uint256);

  function executePSMSwap(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut
  ) external payable returns (uint256);

  function executeFraxSwap(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut
  ) external payable returns (uint256);

  function executeCamelotSwap(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut
  ) external payable returns (uint256);

  function executeKyberLimitOrder(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut
  ) external payable returns (uint256);

  function callBytes(bytes calldata data) external payable; // 0xd9c45357
}