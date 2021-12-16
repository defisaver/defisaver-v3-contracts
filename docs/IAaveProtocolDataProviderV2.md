# IAaveProtocolDataProviderV2









## Methods

### getAllATokens

```solidity
function getAllATokens() external view returns (struct IAaveProtocolDataProviderV2.TokenData[])
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | IAaveProtocolDataProviderV2.TokenData[] | undefined

### getAllReservesTokens

```solidity
function getAllReservesTokens() external view returns (struct IAaveProtocolDataProviderV2.TokenData[])
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | IAaveProtocolDataProviderV2.TokenData[] | undefined

### getReserveConfigurationData

```solidity
function getReserveConfigurationData(address asset) external view returns (uint256 decimals, uint256 ltv, uint256 liquidationThreshold, uint256 liquidationBonus, uint256 reserveFactor, bool usageAsCollateralEnabled, bool borrowingEnabled, bool stableBorrowRateEnabled, bool isActive, bool isFrozen)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| asset | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| decimals | uint256 | undefined
| ltv | uint256 | undefined
| liquidationThreshold | uint256 | undefined
| liquidationBonus | uint256 | undefined
| reserveFactor | uint256 | undefined
| usageAsCollateralEnabled | bool | undefined
| borrowingEnabled | bool | undefined
| stableBorrowRateEnabled | bool | undefined
| isActive | bool | undefined
| isFrozen | bool | undefined

### getReserveData

```solidity
function getReserveData(address asset) external view returns (uint256 availableLiquidity, uint256 totalStableDebt, uint256 totalVariableDebt, uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 averageStableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex, uint40 lastUpdateTimestamp)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| asset | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| availableLiquidity | uint256 | undefined
| totalStableDebt | uint256 | undefined
| totalVariableDebt | uint256 | undefined
| liquidityRate | uint256 | undefined
| variableBorrowRate | uint256 | undefined
| stableBorrowRate | uint256 | undefined
| averageStableBorrowRate | uint256 | undefined
| liquidityIndex | uint256 | undefined
| variableBorrowIndex | uint256 | undefined
| lastUpdateTimestamp | uint40 | undefined

### getReserveTokensAddresses

```solidity
function getReserveTokensAddresses(address asset) external view returns (address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| asset | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| aTokenAddress | address | undefined
| stableDebtTokenAddress | address | undefined
| variableDebtTokenAddress | address | undefined

### getUserReserveData

```solidity
function getUserReserveData(address asset, address user) external view returns (uint256 currentATokenBalance, uint256 currentStableDebt, uint256 currentVariableDebt, uint256 principalStableDebt, uint256 scaledVariableDebt, uint256 stableBorrowRate, uint256 liquidityRate, uint40 stableRateLastUpdated, bool usageAsCollateralEnabled)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| asset | address | undefined
| user | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| currentATokenBalance | uint256 | undefined
| currentStableDebt | uint256 | undefined
| currentVariableDebt | uint256 | undefined
| principalStableDebt | uint256 | undefined
| scaledVariableDebt | uint256 | undefined
| stableBorrowRate | uint256 | undefined
| liquidityRate | uint256 | undefined
| stableRateLastUpdated | uint40 | undefined
| usageAsCollateralEnabled | bool | undefined




