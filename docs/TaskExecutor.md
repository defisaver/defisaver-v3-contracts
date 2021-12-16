# TaskExecutor



> Handles FL taking and executes actions





## Methods

### _executeActionsFromFL

```solidity
function _executeActionsFromFL(StrategyData.Task _currTask, bytes32 _flAmount) external payable
```

This is the callback function that FL actions call

*FL function must be the first action and repayment is done last*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _currTask | StrategyData.Task | Task to be executed
| _flAmount | bytes32 | Result value from FL action

### adminVault

```solidity
function adminVault() external view returns (contract AdminVault)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract AdminVault | undefined

### executeStrategyTask

```solidity
function executeStrategyTask(uint256 _strategyId, bytes[][] _actionCallData) external payable
```

Called through the Strategy contract to execute a task



#### Parameters

| Name | Type | Description |
|---|---|---|
| _strategyId | uint256 | Id of the strategy we want to execute
| _actionCallData | bytes[][] | All the data related to the strategies Task

### executeTask

```solidity
function executeTask(StrategyData.Task _currTask) external payable
```

Called directly through DsProxy to execute a task

*This is the main entry point for Recipes/Tasks executed manually*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _currTask | StrategyData.Task | Task to be executed

### givePermission

```solidity
function givePermission(address _contractAddr) external nonpayable
```

Called in the context of DSProxy to authorize an address



#### Parameters

| Name | Type | Description |
|---|---|---|
| _contractAddr | address | Address which will be authorized

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

### removePermission

```solidity
function removePermission(address _contractAddr) external nonpayable
```

Called in the context of DSProxy to remove authority of an address



#### Parameters

| Name | Type | Description |
|---|---|---|
| _contractAddr | address | Auth address which will be removed from authority list

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




