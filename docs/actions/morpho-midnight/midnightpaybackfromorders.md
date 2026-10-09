---
icon: bluesky
---

# MidnightPaybackFromOrders

### Description

Repay debt in the Midnight market by buying debt units at the market price.

### Action ID

`0x190b0b43`

### SDK Action

```ts
const midnightPaybackFromOrdersAction = new dfs.actions.midnight.MidnightPaybackFromOrdersAction(
    marketId,
    onBehalf,
    from,
    amount,
    minUnits,
    offerFills
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
/// @param marketId Market id.
/// @param onBehalf Address whose debt is repaid. Defaults to the user's wallet if not provided.
/// @param from Address from which to pull the payback tokens.
/// @param amount Amount of tokens to spend. Send type(uint).max to pay back the whole debt.
/// @param minUnits Minimum number of debt units to repay (Slippage protection).
/// @param offerFills Array of offer fills to pay back from.
struct Params {
    bytes32 marketId;
    address onBehalf;
    address from;
    uint256 amount;
    uint256 minUnits;
    OfferFill[] offerFills;
}
```

#### OfferFill data

```solidity
struct CollateralParams {
    address token;
    uint256 lltv;
    uint256 liquidationCursor;
    address oracle;
}

struct Market {
    uint256 chainId;
    address midnight;
    address loanToken;
    CollateralParams[] collateralParams;
    uint256 maturity;
    uint256 rcfThreshold;
    address enterGate;
    address liquidatorGate;
}

struct Offer {
    Market market;
    bool buy;
    address maker;
    uint256 start;
    uint256 expiry;
    uint256 tick;
    bytes32 group;
    address callback;
    bytes callbackData;
    address receiverIfMakerIsSeller;
    address ratifier;
    bool reduceOnly;
    uint128 maxUnits;
    uint128 maxAssets; // buyerAssets if offer.buy else sellerAssets
    uint256 continuousFeeCap;
}

struct OfferFill {
    Offer offer;
    bytes ratifierData;
    uint256 units;
}
```

### Return Value

```solidity
return bytes32(amount);
```

### Events and Logs

```solidity
emit ActionEvent("MidnightPaybackFromOrders", logData);
logger.logActionDirectEvent("MidnightPaybackFromOrders", logData);
bytes memory logData = abi.encode(params);
```
