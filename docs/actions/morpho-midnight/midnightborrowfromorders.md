---
icon: bluesky
---

# MidnightBorrowFromOrders

### Description

Borrow tokens from the Midnight market using one or more off-chain orders.

### Action ID

`0x493c5822`

### SDK Action

```ts
const midnightBorrowFromOrdersAction = new dfs.actions.midnight.MidnightBorrowFromOrdersAction(
    marketId,
    onBehalf,
    to,
    amount,
    maxUnits,
    offerFills
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param marketId Market id.
    /// @param onBehalf Address to borrow tokens on behalf of. Defaults to the user's wallet if not provided.
    /// @param to Address to send the borrowed tokens to.
    /// @param amount Amount of tokens to borrow.
    /// @param maxUnits Maximum number of units to take from the orders (Slippage protection)
    /// @param offerFills Array of offer fills to borrow from.
    struct Params {
        bytes32 marketId;
        address onBehalf;
        address to;
        uint256 amount;
        uint256 maxUnits;
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
emit ActionEvent("MidnightBorrowFromOrders", logData);
logger.logActionDirectEvent("MidnightBorrowFromOrders", logData);
bytes memory logData = abi.encode(params);
```
