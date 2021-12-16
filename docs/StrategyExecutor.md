# StrategyExecutor



> Main entry point for executing automated strategies





## Methods

### ERR_BOT_NOT_APPROVED

```solidity
function ERR_BOT_NOT_APPROVED() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### ERR_STRATEGY_NOT_ACTIVE

```solidity
function ERR_STRATEGY_NOT_ACTIVE() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### ERR_TRIGGER_NOT_ACTIVE

```solidity
function ERR_TRIGGER_NOT_ACTIVE() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### adminVault

```solidity
function adminVault() external view returns (contract AdminVault)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract AdminVault | undefined

### checkCallerAuth

```solidity
function checkCallerAuth(uint256 _strategyId) external view
```

Checks if msg.sender has auth, reverts if not



#### Parameters

| Name | Type | Description |
|---|---|---|
| _strategyId | uint256 | Id of the strategy

### checkTriggers

```solidity
function checkTriggers(uint256 _strategyId, StrategyData.Strategy _strategy, bytes[][] _triggerCallData, contract Subscriptions _sub) external nonpayable
```

Checks if all the triggers are true, reverts if not



#### Parameters

| Name | Type | Description |
|---|---|---|
| _strategyId | uint256 | undefined
| _strategy | StrategyData.Strategy | Strategy data we have in storage
| _triggerCallData | bytes[][] | All input data needed to execute triggers
| _sub | contract Subscriptions | undefined

### executeStrategy

```solidity
function executeStrategy(uint256 _strategyId, bytes[][] _triggerCallData, bytes[][] _actionsCallData) external nonpayable
```

Checks all the triggers and executes actions

*Only authorized callers can execute it*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _strategyId | uint256 | Id of the strategy
| _triggerCallData | bytes[][] | All input data needed to execute triggers
| _actionsCallData | bytes[][] | All input data needed to execute actions

### kill

```solidity
function kill() external nonpayable
```

Destroy the contract




### registry

```solidity
function registry() external view returns (contract DFSRegistry)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract DFSRegistry | undefined

### withdrawStuckFunds

```solidity
function withdrawStuckFunds(address _token, address _receiver, uint256 _amount) external nonpayable
```

withdraw stuck funds



#### Parameters

| Name | Type | Description |
|---|---|---|
| _token | address | undefined
| _receiver | address | undefined
| _amount | uint256 | undefined




