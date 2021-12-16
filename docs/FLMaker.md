# FLMaker









## Methods

### CALLBACK_SELECTOR

```solidity
function CALLBACK_SELECTOR() external view returns (bytes4)
```



*Function sig of TaskExecutor._executeActionsFromFL()*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes4 | undefined

### CALLBACK_SUCCESS

```solidity
function CALLBACK_SUCCESS() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

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

### NO_PARAM_MAPPING

```solidity
function NO_PARAM_MAPPING() external view returns (uint8)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint8 | undefined

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
function executeAction(bytes[] _callData, bytes[], uint8[], bytes32[]) external payable returns (bytes32)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _callData | bytes[] | undefined
| _1 | bytes[] | undefined
| _2 | uint8[] | undefined
| _3 | bytes32[] | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

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

### onFlashLoan

```solidity
function onFlashLoan(address _initiator, address _token, uint256 _amount, uint256 _fee, bytes _data) external nonpayable returns (bytes32)
```

ERC3156 callback function that formats and calls back TaskExecutor



#### Parameters

| Name | Type | Description |
|---|---|---|
| _initiator | address | undefined
| _token | address | undefined
| _amount | uint256 | undefined
| _fee | uint256 | undefined
| _data | bytes | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

### parseInputs

```solidity
function parseInputs(bytes[] _callData) external pure returns (struct FLMaker.Params params)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _callData | bytes[] | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| params | FLMaker.Params | undefined

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




