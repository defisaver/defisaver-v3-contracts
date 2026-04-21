---
icon: bolt-lightning
---

# FLAction

### Description

**Action ID:** 0xbcab5e2a

Generalized fl action that gets and receives FL from different variety of sources.

### SDK Action

```javascript
const specificFLAction = new dfs.actions.flashloan.BalancerFlashLoanAction(
    tokens,
    amounts,
);

const flAction = new dfs.actions.flashloan.FLAction(specificFLAction);

```

{% hint style="info" %}
In FLAction `flParamGetterAddr` and `flParamGetterData` are not used for on-chain getting of flash loan parameters. `flParamGetterData` is used to choose between FL providers
{% endhint %}

### Contract

This is a DFS **FL\_ACTION**.

**Input:**

Inputs are not parsed as the FL action is always the first action and there are no return values before this action

```solidity
// @param tokens Array of tokens being flash loaned
// @param amounts Array of amounts being flash loaned
// @param modes Modes we want to flash loan (repay debt or incur debt, only 0 debt type is supported).
// @param onBehalfOf If we are not repaying the flash loan what address will incur the debt (can be empty if we are just repaying the loan)
// @param flParamGetterAddr Address of an on chain contract that can change (amount, token) while calling the action. If it's an empty address it will not be called. Not used in this implementation.
// @param flParamGetterData Used to choose between FL providers
// @param recipeData Recipe data for post fl execution inside recipe
struct FlashLoanParams {
    address[] tokens;
    uint256[] amounts;
    uint256[] modes;
    address onBehalfOf;
    address flParamGetterAddr;
    bytes flParamGetterData;
    bytes recipeData;
}
```

**Return value:**

```solidity
return bytes32(amount);
```

#### Events:

```solidity
emit ActionEvent("FLAction", abi.encode("<FL_PROVIDER_NAME>", flParams);
```

### Supported providers

#### Aave V2/V3

Aave V2/V3 flash loans are specific as you can borrow multiple assets all at once and repay them at the end or incur debt at the end. When repaying the Aave V2/V3 FL you only need to set an approval and tokens will get pulled with no need to send the FL amount anywhere

#### Spark

Same as AAVE

#### Balancer

Receives a flash loan from the Balancer Vault. Multiple assets can be borrowed and repaid in the same flash loan

{% hint style="info" %}
Asset borrow limit is determined by the asset balance of the Vault.
{% endhint %}

#### Maker

Receives a flash loan from the Maker protocol. Protocol only supports DAI loans.

{% hint style="info" %}
The flash loan fee and limit are set by the Maker Governance, they are liable to change in the future. Currently the fee is set at `0%` and the loan limit is `0.5 * 1e9 DAI`
{% endhint %}

#### Uniswap V3

Receives a flash loan from Uniswap V3 protocol.

#### Gho

Gets a GHO FL from Gho Flash Minter.

#### Morpho Blue

Receives a flash loan from Morpho Blue protocol.

#### Curve USD

Receives a crvUSD flash loan from CurveUsd protocol.

#### Balancer V3

Receives a flash loan from BalancerV3 Vault. Multiple assets can be borrowed and repaid in the same flash loan.
