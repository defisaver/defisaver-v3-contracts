---
icon: arrows-rotate
---

# DFSSellNoFee

### Description

A exchange sell action through the dfs exchange that does not take any fee

> **Notes**
>
> Sells a specified srcAmount for the dest token

### Action ID

`0xebf16d4a`

### SDK Action

```ts
const dFSSellNoFeeAction = new dfs.actions.DFSSellNoFeeAction(
    exchangeOrder,
    from,
    to,
);

```

### Action Type

`STANDARD_ACTION`

### Input Parameters

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
struct Params {
    ExchangeData exchangeData;
    address from;
    address to;
}
```

### Return Value

```solidity
return bytes32(exchangedAmount);
```

### Events and Logs

```solidity
emit ActionEvent("DFSSellNoFee", logData);
logger.logActionDirectEvent("DFSSellNoFee", logData);
bytes memory logData = abi.encode(params);
```
