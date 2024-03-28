// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

contract DFSExchangeData {

    struct OffchainData {
        address wrapper; // dfs wrapper address for the aggregator (must be in WrapperExchangeRegistry)
        address exchangeAddr; // exchange address we are calling to execute the order (must be in ExchangeAggregatorRegistry)
        address allowanceTarget; // exchange aggregator contract we give allowance to
        uint256 price; // expected price that the aggregator sent us
        uint256 protocolFee; // deprecated (used as a separate fee amount for 0x v1)
        bytes callData; // 0ff-chain calldata the aggregator gives to perform the swap
    }

    struct ExchangeData {
        address srcAddr; // source token address (which we're selling)
        address destAddr; // destination token address (which we're buying)
        uint256 srcAmount; // amount of source token in token decimals
        uint256 destAmount; // amount of bought token in token decimals
        uint256 minPrice; // minPrice we are expecting (checked in DFSExchangeCore)
        uint256 dfsFeeDivider; // service fee divider
        address user; // currently deprecated (used to check custom fees for the user)
        address wrapper; // on-chain wrapper address (must be in WrapperExchangeRegistry)
        bytes wrapperData; // on-chain additional data for on-chain (uniswap route for example)
        OffchainData offchainData; // offchain aggregator order
    }
}