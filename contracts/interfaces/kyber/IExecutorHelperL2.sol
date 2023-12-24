// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

interface IExecutorHelperL2 {
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

  struct SwapCallbackData {
    bytes path;
    address payer;
  }

  struct SwapCallbackDataPath {
    address pool;
    address tokenIn;
    address tokenOut;
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

  struct WSTETH {
    address pool;
    uint256 amount;
    bool isWrapping;
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

  struct Maverick {
    address pool;
    address tokenIn;
    address tokenOut;
    address recipient;
    uint256 swapAmount;
    uint256 sqrtPriceLimitD18;
  }

  /// @notice Struct for Sync Swap
  /// @param _data encode of (address, address, uint8) : (tokenIn, recipient, withdrawMode)
  ///  Withdraw with mode.
  // 0 = DEFAULT
  // 1 = UNWRAPPED
  // 2 = WRAPPED
  /// @param vault vault contract
  /// @param tokenIn token input to swap
  /// @param pool pool of SyncSwap
  /// @param collectAmount amount that should be transferred to the pool
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

  struct TraderJoeV2 {
    address recipient;
    address pool;
    address tokenIn;
    address tokenOut;
    uint256 collectAmount; // most significant 1 bit is to determine whether pool is v2.0, else v2.1
  }

  struct LevelFiV2 {
    address pool;
    address fromToken;
    address toToken;
    uint256 amountIn;
    uint256 minAmountOut;
    address recipient; // receive token out
  }

  struct GMXGLP {
    address rewardRouter;
    address stakedGLP;
    address glpManager;
    address yearnVault;
    address tokenIn;
    address tokenOut;
    uint256 swapAmount;
    address recipient;
  }

  function executeUniswap(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut,
    address tokenIn,
    bool getPoolOnly,
    address nextPool
  ) external payable returns (address tokenOut, uint256 tokenAmountOut, address pool);

  function executeKSClassic(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut,
    address tokenIn,
    bool getPoolOnly,
    address nextPool
  ) external payable returns (address tokenOut, uint256 tokenAmountOut, address pool);

  function executeVelodrome(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut,
    address tokenIn,
    bool getPoolOnly,
    address nextPool
  ) external payable returns (address tokenOut, uint256 tokenAmountOut, address pool);

  function executeFrax(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut,
    address tokenIn,
    bool getPoolOnly,
    address nextPool
  ) external payable returns (address tokenOut, uint256 tokenAmountOut, address pool);

  function executeCamelot(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut,
    address tokenIn,
    bool getPoolOnly,
    address nextPool
  ) external payable returns (address tokenOut, uint256 tokenAmountOut, address pool);

  function executeKyberLimitOrder(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut,
    address tokenIn,
    bool getPoolOnly,
    address nextPool
  ) external payable returns (address tokenOut, uint256 tokenAmountOut, address pool);

  function executeRfq(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut,
    address tokenIn,
    bool getPoolOnly,
    address nextPool
  ) external payable returns (address tokenOut, uint256 tokenAmountOut, address pool);

  function executeHashflow(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut,
    address tokenIn,
    bool getPoolOnly,
    address nextPool
  ) external payable returns (address tokenOut, uint256 tokenAmountOut, address pool);

  function executeStableSwap(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut,
    address tokenIn,
    bool getPoolOnly,
    address nextPool
  ) external payable returns (address tokenOut, uint256 tokenAmountOut, address pool);

  function executeCurve(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut,
    address tokenIn,
    bool getPoolOnly,
    address nextPool
  ) external payable returns (address tokenOut, uint256 tokenAmountOut, address pool);

  function executeUniV3KSElastic(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut,
    address tokenIn,
    bool getPoolOnly,
    address nextPool
  ) external payable returns (address tokenOut, uint256 tokenAmountOut, address pool);

  function executeBalV2(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut,
    address tokenIn,
    bool getPoolOnly,
    address nextPool
  ) external payable returns (address tokenOut, uint256 tokenAmountOut, address pool);

  function executeDODO(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut,
    address tokenIn,
    bool getPoolOnly,
    address nextPool
  ) external payable returns (address tokenOut, uint256 tokenAmountOut, address pool);

  function executeGMX(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut,
    address tokenIn,
    bool getPoolOnly,
    address nextPool
  ) external payable returns (address tokenOut, uint256 tokenAmountOut, address pool);

  function executeSynthetix(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut,
    address tokenIn,
    bool getPoolOnly,
    address nextPool
  ) external payable returns (address tokenOut, uint256 tokenAmountOut, address pool);

  function executeWrappedstETH(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut,
    address tokenIn,
    bool getPoolOnly,
    address nextPool
  ) external payable returns (address tokenOut, uint256 tokenAmountOut, address pool);

  function executeStEth(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut,
    address tokenIn,
    bool getPoolOnly,
    address nextPool
  ) external payable returns (address tokenOut, uint256 tokenAmountOut, address pool);

  function executePlatypus(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut,
    address tokenIn,
    bool getPoolOnly,
    address nextPool
  ) external payable returns (address tokenOut, uint256 tokenAmountOut, address pool);

  function executePSM(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut,
    address tokenIn,
    bool getPoolOnly,
    address nextPool
  ) external payable returns (address tokenOut, uint256 tokenAmountOut, address pool);

  function executeMaverick(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut,
    address tokenIn,
    bool getPoolOnly,
    address nextPool
  ) external payable returns (address tokenOut, uint256 tokenAmountOut, address pool);

  function executeSyncSwap(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut,
    address tokenIn,
    bool getPoolOnly,
    address nextPool
  ) external payable returns (address tokenOut, uint256 tokenAmountOut, address pool);

  function executeAlgebraV1(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut,
    address tokenIn,
    bool getPoolOnly,
    address nextPool
  ) external payable returns (address tokenOut, uint256 tokenAmountOut, address pool);

  function executeBalancerBatch(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut,
    address tokenIn,
    bool getPoolOnly,
    address nextPool
  ) external payable returns (address tokenOut, uint256 tokenAmountOut, address pool);

  function executeWombat(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut,
    address tokenIn,
    bool getPoolOnly,
    address nextPool
  ) external payable returns (address tokenOut, uint256 tokenAmountOut, address pool);

  function executeMantis(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut,
    address tokenIn,
    bool getPoolOnly,
    address nextPool
  ) external payable returns (address tokenOut, uint256 tokenAmountOut, address pool);

  function executeIziSwap(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut,
    address tokenIn,
    bool getPoolOnly,
    address nextPool
  ) external payable returns (address tokenOut, uint256 tokenAmountOut, address pool);

  function executeTraderJoeV2(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut,
    address tokenIn,
    bool getPoolOnly,
    address nextPool
  ) external payable returns (address tokenOut, uint256 tokenAmountOut, address pool);

  function executeLevelFiV2(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut,
    address tokenIn,
    bool getPoolOnly,
    address nextPool
  ) external payable returns (address tokenOut, uint256 tokenAmountOut, address pool);

  function executeGMXGLP(
    uint256 index,
    bytes memory data,
    uint256 previousAmountOut,
    address tokenIn,
    bool getPoolOnly,
    address nextPool
  ) external payable returns (address tokenOut, uint256 tokenAmountOut, address pool);
}