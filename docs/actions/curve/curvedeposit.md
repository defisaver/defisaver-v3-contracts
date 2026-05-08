# ➰ CurveDeposit

### Description

Action that deposits `tokens` into liquidity pool via `depositTarget` receiving `lpToken`.

{% hint style="info" %}
User needs to approve every token in `tokens` which has a nonzero deposit amount specified in `amounts`.&#x20;
{% endhint %}

{% hint style="info" %}
If one of the tokens  == `0xEeee...` the user needs to have an appropriate balance of `WETH` that will be used instead of native `ETH`. User needs to approve the `its wallet` to pull `WETH`.
{% endhint %}

### Action ID

`0xeae20b37`

### SDK Action

```ts
const curveDepositAction = new dfs.actions.curve.CurveDepositAction(
    sender,
    receiver,
    poolAddr,
    minMintAmount,
    useUnderlying,
    amounts
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param from Address where to pull tokens from
    /// @param to Address that will receive the LP tokens
    /// @param depositTargetOrPool Address of the pool contract or zap deposit contract in which to deposit
    /// @param minMintAmount Minimum amount of LP tokens to accept
    /// @param flags Flags for the deposit
    /// @param amounts Amount of each token to deposit
    struct Params {
        address from;
        address to;
        address depositTargetOrPool;
        uint256 minMintAmount;
        uint8 flags;
        uint256[] amounts;
    }
```

#### Flags parameter:

This parameter is the same for both deposit and withdraw actions.

It holds two flags: `explicitUnderlying` (1 << 2 bitmask), `withdrawExact`(1 << 3 bitmask), as well as `depositTargetType` enum which takes up the lower 2 bits.

* `bool explicitUnderlying` - used when the curve pool doesn't have a dedicated deposit zap but has underlying tokens that we want to deposit or withdraw.
* `bool withdrawExact` - explained here but relevant only for `CurveWithdraw`:\
  **if true** - `burnAmount` specifies the _MAXIMUM_ amount of lp tokens to burn, `amounts` specifies the _EXACT_ amount of tokens to withdraw;\
  **if false** - `burnAmount` specifies _EXACT_ amount of lp tokens to burn, `amounts` specifies the _MINIMUM_ amount of withdrawn tokens to accept;
* `uint2 depositTargetType:`\
  **SWAP (=0)** - target is pool swap contract\
  **ZAP\_POOL** - target is zap with the pool address view function signature `pool()`\
  **ZAP\_CURVE** - target is zap with the pool address view function signature `curve()`

### Return Value

```solidity
return bytes32(received);
```

### Events and Logs

```solidity
emit ActionEvent("CurveDeposit", logData);
logger.logActionDirectEvent("CurveDeposit", logData);
bytes memory logData = abi.encode(params);
```
