// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

library StableCoinUtils {
    uint256 public constant MAINNET_CHAIN_ID = 1;
    uint256 public constant ARBITRUM_CHAIN_ID = 42161;
    uint256 public constant BASE_CHAIN_ID = 8453;

    // mainnet
    address public constant USDC_ADDR_MAINNET = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT_ADDR_MAINNET = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDS_ADDR_MAINNET = 0xdC035D45d973E3EC169d2276DDab16f1e407384F;

    //arbitrum
    address public constant USDC_ADDR_ARB = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
    address public constant USDT_ADDR_ARB = 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9;
    address public constant USDCE_ADDR_ARB = 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8;

    // base
    address public constant USDC_ADDR_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address public constant USDS_ADDR_BASE = 0x820C137fa70C8691f0e44Dc420a5e53c168921Dc;
    address public constant USDBC_ADDR_BASE = 0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA;

    function isStableCoin(address _baseToken) public view returns (bool) {
        if (block.chainid == MAINNET_CHAIN_ID) {
            if (_baseToken == USDC_ADDR_MAINNET) return true;
            if (_baseToken == USDT_ADDR_MAINNET) return true;
            if (_baseToken == USDS_ADDR_MAINNET) return true;

            return false;
        }

        if (block.chainid == ARBITRUM_CHAIN_ID) {
            if (_baseToken == USDC_ADDR_ARB) return true;
            if (_baseToken == USDT_ADDR_ARB) return true;
            if (_baseToken == USDCE_ADDR_ARB) return true;

            return false;
        }

        if (block.chainid == BASE_CHAIN_ID) {
            if (_baseToken == USDC_ADDR_BASE) return true;
            if (_baseToken == USDS_ADDR_BASE) return true;
            if (_baseToken == USDBC_ADDR_BASE) return true;

            return false;
        }

        return false;
    }
}
