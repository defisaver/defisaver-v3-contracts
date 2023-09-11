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
    bool usePoolUnderlying;
    bool useTriCrypto;
  }

  struct UniswapV3KSElastic {
    address recipient;
    address pool;
    address tokenIn;
    address tokenOut;
    uint256 swapAmount;
    uint160 sqrtPriceLimitX96;
    bool isUniV3; // true = UniV3, false = KSElastic
  }

  struct BalancerV2 {
    address vault;
    bytes32 poolId;
    address assetIn;
    address assetOut;
    uint256 amount;
  }

  struct DODO {
    address recipient;
    address pool;
    address tokenFrom;
    address tokenTo;
    uint256 amount;
    address sellHelper;
    bool isSellBase;
    bool isVersion2;
  }

  struct GMX {
    address vault;
    address tokenIn;
    address tokenOut;
    uint256 amount;
    address receiver;
  }

  struct Synthetix {
    address synthetixProxy;
    address tokenIn;
    address tokenOut;
    bytes32 sourceCurrencyKey;
    uint256 sourceAmount;
    bytes32 destinationCurrencyKey;
    bool useAtomicExchange;
  }

  struct Platypus {
    address pool;
    address tokenIn;
    address tokenOut;
    address recipient;
    uint256 collectAmount; // amount that should be transferred to the pool
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

  struct Maverick {
    address pool;
    address tokenIn;
    address tokenOut;
    address recipient;
    uint256 swapAmount;
    uint256 sqrtPriceLimitD18;
  }

  struct SyncSwap {
    bytes _data;
    address vault;
    address tokenIn;
    address pool;
    uint256 collectAmount;
  }

  struct AlgebraV1 {
    address recipient;
    address pool;
    address tokenIn;
    address tokenOut;
    uint256 swapAmount;
    uint160 sqrtPriceLimitX96;
    uint256 senderFeeOnTransfer; // [ FoT_FLAG(1 bit) ... SENDER_ADDRESS(160 bits) ]
  }

  struct BalancerBatch {
    address vault;
    bytes32[] poolIds;
    address[] path; // swap path from assetIn to assetOut
    bytes[] userDatas;
    uint256 amountIn; // assetIn amount
  }

  struct Mantis {
    address pool;
    address tokenIn;
    address tokenOut;
    uint256 amount;
    address recipient;
  }

  struct IziSwap {
    address pool;
    address tokenIn;
    address tokenOut;
    address recipient;
    uint256 swapAmount;
    int24 limitPoint;
  }

  function executeUniswap(
    bytes memory data,
    uint256 flagsAndPrevAmountOut
  ) external payable returns (uint256);

  function executeStableSwap(
    bytes memory data,
    uint256 flagsAndPrevAmountOut
  ) external payable returns (uint256);

  function executeCurve(
    bytes memory data,
    uint256 flagsAndPrevAmountOut
  ) external payable returns (uint256);

  function executeKSClassic(
    bytes memory data,
    uint256 flagsAndPrevAmountOut
  ) external payable returns (uint256);

  function executeUniV3KSElastic(
    bytes memory data,
    uint256 flagsAndPrevAmountOut
  ) external payable returns (uint256);

  function executeRfq(
    bytes memory data,
    uint256 flagsAndPrevAmountOut
  ) external payable returns (uint256);

  function executeBalV2(
    bytes memory data,
    uint256 flagsAndPrevAmountOut
  ) external payable returns (uint256);

  function executeDODO(
    bytes memory data,
    uint256 flagsAndPrevAmountOut
  ) external payable returns (uint256);

  function executeVelodrome(
    bytes memory data,
    uint256 flagsAndPrevAmountOut
  ) external payable returns (uint256);

  function executeGMX(
    bytes memory data,
    uint256 flagsAndPrevAmountOut
  ) external payable returns (uint256);

  function executePlatypus(
    bytes memory data,
    uint256 flagsAndPrevAmountOut
  ) external payable returns (uint256);

  function executeWrappedstETH(
    bytes memory data,
    uint256 flagsAndPrevAmountOut
  ) external payable returns (uint256);

  function executeStEth(
    bytes memory data,
    uint256 flagsAndPrevAmountOut
  ) external payable returns (uint256);

  function executeSynthetix(
    bytes memory data,
    uint256 flagsAndPrevAmountOut
  ) external payable returns (uint256);

  function executeHashflow(
    bytes memory data,
    uint256 flagsAndPrevAmountOut
  ) external payable returns (uint256);

  function executePSM(
    bytes memory data,
    uint256 flagsAndPrevAmountOut
  ) external payable returns (uint256);

  function executeFrax(
    bytes memory data,
    uint256 flagsAndPrevAmountOut
  ) external payable returns (uint256);

  function executeCamelot(
    bytes memory data,
    uint256 flagsAndPrevAmountOut
  ) external payable returns (uint256);

  function executeKyberLimitOrder(
    bytes memory data,
    uint256 flagsAndPrevAmountOut
  ) external payable returns (uint256);

  function executeMaverick(
    bytes memory data,
    uint256 flagsAndPrevAmountOut
  ) external payable returns (uint256);

  function executeSyncSwap(
    bytes memory data,
    uint256 flagsAndPrevAmountOut
  ) external payable returns (uint256);

  function executeAlgebraV1(
    bytes memory data,
    uint256 flagsAndPrevAmountOut
  ) external payable returns (uint256);

  function executeBalancerBatch(
    bytes memory data,
    uint256 flagsAndPrevAmountOut
  ) external payable returns (uint256);

  function executeWombat(
    bytes memory data,
    uint256 flagsAndPrevAmountOut
  ) external payable returns (uint256);

  function executeMantis(
    bytes memory data,
    uint256 flagsAndPrevAmountOut
  ) external payable returns (uint256);

  function executeIziSwap(
    bytes memory data,
    uint256 flagsAndPrevAmountOut
  ) external payable returns (uint256);
}