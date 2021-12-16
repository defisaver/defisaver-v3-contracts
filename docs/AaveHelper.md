# AaveHelper



> Utility functions and data used in AaveV2 actions





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

### STABLE_ID

```solidity
function STABLE_ID() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

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




