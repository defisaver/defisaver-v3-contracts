# AaveWithdraw



> Withdraw a token from an Aave market





## Methods

### AAVE_REFERRAL_CODE

```solidity
function AAVE_REFERRAL_CODE() external view returns (uint16)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint16 | undefined

### AaveIncentivesController

```solidity
function AaveIncentivesController() external view returns (contract IAaveIncentivesController)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IAaveIncentivesController | undefined

### DATA_PROVIDER_ID

```solidity
function DATA_PROVIDER_ID() external view returns (bytes32)
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

### STABLE_ID

```solidity
function STABLE_ID() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

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

### StakedToken

```solidity
function StakedToken() external view returns (contract IStakedToken)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IStakedToken | undefined

### VARIABLE_ID

```solidity
function VARIABLE_ID() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

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

### enableAsCollateral

```solidity
function enableAsCollateral(address _market, address _tokenAddr, bool _useAsCollateral) external nonpayable
```

Enable/Disable a token as collateral for the specified Aave market



#### Parameters

| Name | Type | Description |
|---|---|---|
| _market | address | undefined
| _tokenAddr | address | undefined
| _useAsCollateral | bool | undefined

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

### switchRateMode

```solidity
function switchRateMode(address _market, address _tokenAddr, uint256 _rateMode) external nonpayable
```

Switches the borrowing rate mode (stable/variable) for the user



#### Parameters

| Name | Type | Description |
|---|---|---|
| _market | address | undefined
| _tokenAddr | address | undefined
| _rateMode | uint256 | undefined

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




