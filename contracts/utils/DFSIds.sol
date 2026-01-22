// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

library DFSIds {
    bytes4 internal constant RECIPE_EXECUTOR = bytes4(keccak256("RecipeExecutor"));
    bytes4 internal constant STRATEGY_EXECUTOR = bytes4(keccak256("StrategyExecutorID")); // Abstract, so support both L1 and L2
    bytes4 internal constant TX_SAVER_EXECUTOR = bytes4(keccak256("TxSaverExecutor"));
    bytes4 internal constant BOT_AUTH = bytes4(keccak256("BotAuth"));
    bytes4 internal constant BOT_AUTH_FOR_TX_SAVER = bytes4(keccak256("BotAuthForTxSaver"));
    bytes4 internal constant KYBER_SCALING_HELPER = bytes4(keccak256("KyberInputScalingHelper"));
    bytes4 internal constant LLAMALEND_SWAPPER = bytes4(keccak256("LlamaLendSwapper"));
    bytes4 internal constant CURVE_SWAPPER = bytes4(keccak256("CurveUsdSwapper"));
    bytes4 internal constant CURVE_TRANSIENT_SWAPPER =
        bytes4(keccak256("CurveUsdSwapperTransient"));
    bytes4 internal constant SFPROXY_ENTRY_POINT = bytes4(keccak256("SFProxyEntryPoint"));
}
