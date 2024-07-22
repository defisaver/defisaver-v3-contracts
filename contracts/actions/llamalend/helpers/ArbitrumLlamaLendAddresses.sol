// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;


contract ArbitrumLlamaLendAddresses {
    address internal constant BYTES_TRANSIENT_STORAGE = 0xab38cAeA7dcf9ffa0AE7a7567D72380f2504a0F2;
    address internal constant LLAMALEND_FACTORY = 0xcaEC110C784c9DF37240a8Ce096D352A75922DeA;
    /// @dev this is the only WETH controller which has use_eth param default to True in Controller.remove_collateral 
    address internal constant OLD_WETH_CONTROLLER = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
}