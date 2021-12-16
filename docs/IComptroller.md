# IComptroller









## Methods

### borrowCaps

```solidity
function borrowCaps(address) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### claimComp

```solidity
function claimComp(address holder) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| holder | address | undefined

### compAccrued

```solidity
function compAccrued(address) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### compBorrowSpeeds

```solidity
function compBorrowSpeeds(address) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### compBorrowState

```solidity
function compBorrowState(address) external view returns (struct IComptroller.CompMarketState)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | IComptroller.CompMarketState | undefined

### compBorrowerIndex

```solidity
function compBorrowerIndex(address, address) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined
| _1 | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### compSpeeds

```solidity
function compSpeeds(address) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### compSupplierIndex

```solidity
function compSupplierIndex(address, address) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined
| _1 | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### compSupplySpeeds

```solidity
function compSupplySpeeds(address) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### compSupplyState

```solidity
function compSupplyState(address) external view returns (struct IComptroller.CompMarketState)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | IComptroller.CompMarketState | undefined

### enterMarkets

```solidity
function enterMarkets(address[] cTokens) external nonpayable returns (uint256[])
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| cTokens | address[] | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256[] | undefined

### exitMarket

```solidity
function exitMarket(address cToken) external nonpayable returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| cToken | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getAccountLiquidity

```solidity
function getAccountLiquidity(address account) external view returns (uint256, uint256, uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined
| _1 | uint256 | undefined
| _2 | uint256 | undefined

### getAssetsIn

```solidity
function getAssetsIn(address account) external view returns (address[])
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address[] | undefined

### markets

```solidity
function markets(address account) external view returns (bool, uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined
| _1 | uint256 | undefined

### oracle

```solidity
function oracle() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined




