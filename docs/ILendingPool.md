# ILendingPool









## Methods

### borrow

```solidity
function borrow(address _reserve, uint256 _amount, uint256 _interestRateMode, uint16 _referralCode) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _reserve | address | undefined
| _amount | uint256 | undefined
| _interestRateMode | uint256 | undefined
| _referralCode | uint16 | undefined

### calculateUserGlobalData

```solidity
function calculateUserGlobalData(address _user) external view returns (uint256 totalLiquidityBalanceETH, uint256 totalCollateralBalanceETH, uint256 totalBorrowBalanceETH, uint256 totalFeesETH, uint256 currentLtv, uint256 currentLiquidationThreshold, uint256 healthFactor, bool healthFactorBelowThreshold)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| totalLiquidityBalanceETH | uint256 | undefined
| totalCollateralBalanceETH | uint256 | undefined
| totalBorrowBalanceETH | uint256 | undefined
| totalFeesETH | uint256 | undefined
| currentLtv | uint256 | undefined
| currentLiquidationThreshold | uint256 | undefined
| healthFactor | uint256 | undefined
| healthFactorBelowThreshold | bool | undefined

### deposit

```solidity
function deposit(address _reserve, uint256 _amount, uint16 _referralCode) external payable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _reserve | address | undefined
| _amount | uint256 | undefined
| _referralCode | uint16 | undefined

### flashLoan

```solidity
function flashLoan(address payable _receiver, address _reserve, uint256 _amount, bytes _params) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _receiver | address payable | undefined
| _reserve | address | undefined
| _amount | uint256 | undefined
| _params | bytes | undefined

### getReserveATokenAddress

```solidity
function getReserveATokenAddress(address _reserve) external view returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _reserve | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### getReserveAvailableLiquidity

```solidity
function getReserveAvailableLiquidity(address _reserve) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _reserve | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getReserveConfiguration

```solidity
function getReserveConfiguration(address _reserve) external view returns (uint256, uint256, uint256, bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _reserve | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined
| _1 | uint256 | undefined
| _2 | uint256 | undefined
| _3 | bool | undefined

### getReserveConfigurationData

```solidity
function getReserveConfigurationData(address _reserve) external view returns (uint256 ltv, uint256 liquidationThreshold, uint256 liquidationBonus, address rateStrategyAddress, bool usageAsCollateralEnabled, bool borrowingEnabled, bool stableBorrowRateEnabled, bool isActive)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _reserve | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| ltv | uint256 | undefined
| liquidationThreshold | uint256 | undefined
| liquidationBonus | uint256 | undefined
| rateStrategyAddress | address | undefined
| usageAsCollateralEnabled | bool | undefined
| borrowingEnabled | bool | undefined
| stableBorrowRateEnabled | bool | undefined
| isActive | bool | undefined

### getReserveCurrentLiquidityRate

```solidity
function getReserveCurrentLiquidityRate(address _reserve) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _reserve | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getReserveCurrentStableBorrowRate

```solidity
function getReserveCurrentStableBorrowRate(address _reserve) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _reserve | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getReserveCurrentVariableBorrowRate

```solidity
function getReserveCurrentVariableBorrowRate(address _reserve) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _reserve | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getReserveData

```solidity
function getReserveData(address _reserve) external view returns (uint256 totalLiquidity, uint256 availableLiquidity, uint256 totalBorrowsStable, uint256 totalBorrowsVariable, uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 averageStableBorrowRate, uint256 utilizationRate, uint256 liquidityIndex, uint256 variableBorrowIndex, address aTokenAddress, uint40 lastUpdateTimestamp)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _reserve | address | underlying token address

#### Returns

| Name | Type | Description |
|---|---|---|
| totalLiquidity | uint256 | undefined
| availableLiquidity | uint256 | undefined
| totalBorrowsStable | uint256 | undefined
| totalBorrowsVariable | uint256 | undefined
| liquidityRate | uint256 | undefined
| variableBorrowRate | uint256 | undefined
| stableBorrowRate | uint256 | undefined
| averageStableBorrowRate | uint256 | undefined
| utilizationRate | uint256 | undefined
| liquidityIndex | uint256 | undefined
| variableBorrowIndex | uint256 | undefined
| aTokenAddress | address | undefined
| lastUpdateTimestamp | uint40 | undefined

### getReserveTotalBorrowsVariable

```solidity
function getReserveTotalBorrowsVariable(address _reserve) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _reserve | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getReserveTotalLiquidity

```solidity
function getReserveTotalLiquidity(address _reserve) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _reserve | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getReserves

```solidity
function getReserves() external view returns (address[])
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address[] | undefined

### getUserAccountData

```solidity
function getUserAccountData(address _user) external view returns (uint256 totalLiquidityETH, uint256 totalCollateralETH, uint256 totalBorrowsETH, uint256 totalFeesETH, uint256 availableBorrowsETH, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | users address

#### Returns

| Name | Type | Description |
|---|---|---|
| totalLiquidityETH | uint256 | undefined
| totalCollateralETH | uint256 | undefined
| totalBorrowsETH | uint256 | undefined
| totalFeesETH | uint256 | undefined
| availableBorrowsETH | uint256 | undefined
| currentLiquidationThreshold | uint256 | undefined
| ltv | uint256 | undefined
| healthFactor | uint256 | undefined

### getUserReserveData

```solidity
function getUserReserveData(address _reserve, address _user) external view returns (uint256 currentATokenBalance, uint256 currentBorrowBalance, uint256 principalBorrowBalance, uint256 borrowRateMode, uint256 borrowRate, uint256 liquidityRate, uint256 originationFee, uint256 variableBorrowIndex, uint256 lastUpdateTimestamp, bool usageAsCollateralEnabled)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _reserve | address | underlying token address
| _user | address | users address

#### Returns

| Name | Type | Description |
|---|---|---|
| currentATokenBalance | uint256 | undefined
| currentBorrowBalance | uint256 | undefined
| principalBorrowBalance | uint256 | undefined
| borrowRateMode | uint256 | undefined
| borrowRate | uint256 | undefined
| liquidityRate | uint256 | undefined
| originationFee | uint256 | undefined
| variableBorrowIndex | uint256 | undefined
| lastUpdateTimestamp | uint256 | undefined
| usageAsCollateralEnabled | bool | undefined

### getUserUnderlyingAssetBalance

```solidity
function getUserUnderlyingAssetBalance(address _reserve, address _user) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _reserve | address | undefined
| _user | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### repay

```solidity
function repay(address _reserve, uint256 _amount, address payable _onBehalfOf) external payable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _reserve | address | undefined
| _amount | uint256 | undefined
| _onBehalfOf | address payable | undefined

### setUserUseReserveAsCollateral

```solidity
function setUserUseReserveAsCollateral(address _reserve, bool _useAsCollateral) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _reserve | address | undefined
| _useAsCollateral | bool | undefined

### swapBorrowRateMode

```solidity
function swapBorrowRateMode(address _reserve) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _reserve | address | undefined




