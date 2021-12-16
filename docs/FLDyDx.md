# FLDyDx



> Action that gets and receives a FL from DyDx protocol





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

### DYDX_DUST_FEE

```solidity
function DYDX_DUST_FEE() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

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

### callFunction

```solidity
function callFunction(address _initiator, Account.Info, bytes _data) external nonpayable
```

Dydx callback function that formats and calls back TaskExecutor



#### Parameters

| Name | Type | Description |
|---|---|---|
| _initiator | address | undefined
| _1 | Account.Info | undefined
| _data | bytes | undefined

### executeAction

```solidity
function executeAction(bytes[] _callData, bytes[], uint8[], bytes32[]) external payable returns (bytes32)
```

Parses inputs and runs the implemented action through a proxy

*Is called by the TaskExecutor chaining actions together*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _callData | bytes[] | Array of input values each value encoded as bytes
| _1 | bytes[] | undefined
| _2 | uint8[] | undefined
| _3 | bytes32[] | undefined

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

### flFeeFaucet

```solidity
function flFeeFaucet() external view returns (contract FLFeeFaucet)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract FLFeeFaucet | undefined

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

### parseInputs

```solidity
function parseInputs(bytes[] _callData) external pure returns (uint256 amount, address token, address flParamGetterAddr, bytes flParamGetterData)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _callData | bytes[] | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| amount | uint256 | undefined
| token | address | undefined
| flParamGetterAddr | address | undefined
| flParamGetterData | bytes | undefined

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




