# McdGenerate



> Generate dai from a Maker Vault





## Methods

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

### getCdpInfo

```solidity
function getCdpInfo(contract IManager _manager, uint256 _cdpId, bytes32 _ilk) external view returns (uint256, uint256)
```

Gets CDP info (collateral, debt)



#### Parameters

| Name | Type | Description |
|---|---|---|
| _manager | contract IManager | Manager contract
| _cdpId | uint256 | Id of the CDP
| _ilk | bytes32 | Ilk of the CDP

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined
| _1 | uint256 | undefined

### getOwner

```solidity
function getOwner(contract IManager _manager, uint256 _cdpId) external view returns (address)
```

Address that owns the DSProxy that owns the CDP



#### Parameters

| Name | Type | Description |
|---|---|---|
| _manager | contract IManager | Manager contract
| _cdpId | uint256 | Id of the CDP

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

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

### spotter

```solidity
function spotter() external view returns (contract ISpotter)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract ISpotter | undefined

### vat

```solidity
function vat() external view returns (contract IVat)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IVat | undefined

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




