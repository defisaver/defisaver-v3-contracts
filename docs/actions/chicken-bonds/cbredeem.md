---
description: Redeem LUSD (sometimes yTokens) for bLUSD
icon: drumstick
---

# CBRedeem

### Description

Action redeems bLUSD tokens for LUSD tokens, from the chickend bond manager contract. The user gets back LUSD tokens based on the redemption rate of the contract. Yearn yTokens can also be returned back to the user in case of the vault is deprecated and makes it redeemable.

Action calls [`ChickenBondManager.redeem(uint256 _bLUSDToRedeem, uint256 _minLUSDFromBAMMSPVault);`](https://github.com/liquity/ChickenBond/blob/3e20aa2672ed4cc15e47a2b154f1c5a9f3597908/LUSDChickenBonds/src/ChickenBondManager.sol#L450)

### Action ID

`0x0ec91495`

### SDK Action

```ts
const cBRedeemAction = new dfs.actions.chickenBonds.CBRedeemAction(
    bLUSDAmount,
    minLUSDFromSP,
    from,
    to
);
```

### Action Type

`STANDARD_ACTION`

### Input Parameters

```solidity
    /// @param bLUSDAmount Amount of bLusd tokens to pull
    /// @param minLUSDFromSP Min. amount of LUSD to receive
    /// @param from Address from where to pull bLusd tokens
    /// @param to Address where to send LUSD tokens (possibly yTokens as well)
    struct Params {
        uint256 bLUSDAmount;
        uint256 minLUSDFromSP;
        address from;
        address to;
    }
```

### Return Value

```solidity
return bytes32(lusdAmount);
```

### Events and Logs

```solidity
emit ActionEvent("CBRedeem", logData);
logger.logActionDirectEvent("CBRedeem", logData);
bytes memory logData = abi.encode(params);
```
