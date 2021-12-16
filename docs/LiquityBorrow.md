# LiquityBorrow









## Methods

### BorrowerOperations

```solidity
function BorrowerOperations() external view returns (contract IBorrowerOperations)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IBorrowerOperations | undefined

### CollSurplusPool

```solidity
function CollSurplusPool() external view returns (contract ICollSurplusPool)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract ICollSurplusPool | undefined

### ERR_RETURN_INDEX_VALUE

```solidity
function ERR_RETURN_INDEX_VALUE() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### ERR_SUB_INDEX_VALUE

```solidity
function ERR_SUB_INDEX_VALUE() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### HintHelpers

```solidity
function HintHelpers() external view returns (contract IHintHelpers)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IHintHelpers | undefined

### LQTYStaking

```solidity
function LQTYStaking() external view returns (contract ILQTYStaking)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract ILQTYStaking | undefined

### LUSD_GAS_COMPENSATION

```solidity
function LUSD_GAS_COMPENSATION() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### NO_PARAM_MAPPING

```solidity
function NO_PARAM_MAPPING() external view returns (uint8)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint8 | undefined

### PriceFeed

```solidity
function PriceFeed() external view returns (contract IPriceFeed)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IPriceFeed | undefined

### RETURN_MAX_INDEX_VALUE

```solidity
function RETURN_MAX_INDEX_VALUE() external view returns (uint8)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint8 | undefined

### RETURN_MIN_INDEX_VALUE

```solidity
function RETURN_MIN_INDEX_VALUE() external view returns (uint8)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint8 | undefined

### SUB_MAX_INDEX_VALUE

```solidity
function SUB_MAX_INDEX_VALUE() external view returns (uint8)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint8 | undefined

### SUB_MIN_INDEX_VALUE

```solidity
function SUB_MIN_INDEX_VALUE() external view returns (uint8)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint8 | undefined

### SortedTroves

```solidity
function SortedTroves() external view returns (contract ISortedTroves)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract ISortedTroves | undefined

### StabilityPool

```solidity
function StabilityPool() external view returns (contract IStabilityPool)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IStabilityPool | undefined

### TroveManager

```solidity
function TroveManager() external view returns (contract ITroveManager)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract ITroveManager | undefined

### actionType

```solidity
function actionType() external pure returns (uint8)
```

Returns the type of action we are implementing




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint8 | undefined

### adminVault

```solidity
function adminVault() external view returns (contract AdminVault)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract AdminVault | undefined

### executeAction

```solidity
function executeAction(bytes[] _callData, bytes[] _subData, uint8[] _paramMapping, bytes32[] _returnValues) external payable returns (bytes32)
```

Parses inputs and runs the implemented action through a proxy

*Is called by the TaskExecutor chaining actions together*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _callData | bytes[] | Array of input values each value encoded as bytes
| _subData | bytes[] | Array of subscribed vales, replaces input values if specified
| _paramMapping | uint8[] | Array that specifies how return and subscribed values are mapped in input
| _returnValues | bytes32[] | Returns values from actions before, which can be injected in inputs

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | Returns a bytes32 value through DSProxy, each actions implements what that value is

### executeActionDirect

```solidity
function executeActionDirect(bytes[] _callData) external payable
```

Parses inputs and runs the single implemented action through a proxy

*Used to save gas when executing a single action directly*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _callData | bytes[] | undefined

### kill

```solidity
function kill() external nonpayable
```

Destroy the contract




### logger

```solidity
function logger() external view returns (contract DefisaverLogger)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract DefisaverLogger | undefined

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




