---
icon: ethereum
---

# EtherFiStakeFromLido

### Description

Deposits wstETH through Ether.fi's Lido route and receives weETH. The action approves wstETH for the DepositAdapter at `0xE87797A1aFb329216811dfA22C87380128CA17d8` and supplies an empty permit.

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
struct Params {
    uint256 amount;
    uint256 minAmountOut;
    address from;
    address to;
}
```

### Return Value

```solidity
return bytes32(weEthReceivedAmount);
```
