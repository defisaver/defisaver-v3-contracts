---
icon: arrows-rotate-reverse
---

# LimitSell

### Description

**Action ID:** 0x8c712c04

A special Limit Sell action used as a part of the limit order strategy

### SDK Action

```javascript
const dfsLimitSellAction = new dfs.actions.basic.LimitSell(
    exchangeOrder,
    from,
    to,
    gasUsed
);
```

### Contract

This is a DFS **STANDARD\_ACTION**.

**Input:**

```solidity

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
    address user; // user to check if custom fee is set for the user
    address wrapper; // on-chain wrapper address (must be in WrapperExchangeRegistry)
    bytes wrapperData; // on-chain additional data for on-chain (uniswap route for example)
    OffchainData offchainData; // offchain aggregator order
}

// @param exchangeData data
// @param from The order sender
// @param to The order recipient
// @param gasUsed Amount of gas spent as part of the strategy   
struct Params {
    ExchangeData exchangeData;
    address from;
    address to;
    uint256 gasUsed;
}
```

**Return value:**

```solidity
return bytes32(exchangeAmount);
```

#### Events:

```solidity
emit ActionEvent("LimitSell", logData);

bytes memory logData = abi.encode(
    wrapper,
    _exchangeData.srcAddr,
    _exchangeData.destAddr,
    _exchangeData.srcAmount,
    exchangedAmount,
    _exchangeData.dfsFeeDivider
);
```
