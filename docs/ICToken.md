# ICToken









## Methods

### accrueInterest

```solidity
function accrueInterest() external nonpayable returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### allowance

```solidity
function allowance(address _owner, address _spender) external view returns (uint256 remaining)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _owner | address | undefined
| _spender | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| remaining | uint256 | undefined

### approve

```solidity
function approve(address _spender, uint256 _value) external nonpayable returns (bool success)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _spender | address | undefined
| _value | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| success | bool | undefined

### balanceOf

```solidity
function balanceOf(address _owner) external view returns (uint256 balance)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _owner | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| balance | uint256 | undefined

### balanceOfUnderlying

```solidity
function balanceOfUnderlying(address owner) external nonpayable returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| owner | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### borrow

```solidity
function borrow(uint256 borrowAmount) external nonpayable returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| borrowAmount | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### borrowBalanceCurrent

```solidity
function borrowBalanceCurrent(address account) external nonpayable returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### borrowBalanceStored

```solidity
function borrowBalanceStored(address) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### borrowIndex

```solidity
function borrowIndex() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### borrowRatePerBlock

```solidity
function borrowRatePerBlock() external nonpayable returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### decimals

```solidity
function decimals() external view returns (uint256 digits)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| digits | uint256 | undefined

### exchangeRateCurrent

```solidity
function exchangeRateCurrent() external nonpayable returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getAccountSnapshot

```solidity
function getAccountSnapshot(address account) external view returns (uint256, uint256, uint256, uint256)
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
| _3 | uint256 | undefined

### getCash

```solidity
function getCash() external nonpayable returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### liquidateBorrow

```solidity
function liquidateBorrow(address borrower, uint256 repayAmount, address cTokenCollateral) external nonpayable returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| borrower | address | undefined
| repayAmount | uint256 | undefined
| cTokenCollateral | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### mint

```solidity
function mint(uint256 mintAmount) external nonpayable returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| mintAmount | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### name

```solidity
function name() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### redeem

```solidity
function redeem(uint256 redeemTokens) external nonpayable returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| redeemTokens | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### redeemUnderlying

```solidity
function redeemUnderlying(uint256 redeemAmount) external nonpayable returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| redeemAmount | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### repayBorrow

```solidity
function repayBorrow() external payable
```






### repayBorrowBehalf

```solidity
function repayBorrowBehalf(address borrower) external payable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| borrower | address | undefined

### reserveFactorMantissa

```solidity
function reserveFactorMantissa() external nonpayable returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### supplyRatePerBlock

```solidity
function supplyRatePerBlock() external nonpayable returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### symbol

```solidity
function symbol() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### totalBorrowsCurrent

```solidity
function totalBorrowsCurrent() external nonpayable returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### totalReserves

```solidity
function totalReserves() external nonpayable returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### totalSupply

```solidity
function totalSupply() external view returns (uint256 supply)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| supply | uint256 | undefined

### transfer

```solidity
function transfer(address _to, uint256 _value) external nonpayable returns (bool success)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _to | address | undefined
| _value | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| success | bool | undefined

### transferFrom

```solidity
function transferFrom(address _from, address _to, uint256 _value) external nonpayable returns (bool success)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _from | address | undefined
| _to | address | undefined
| _value | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| success | bool | undefined

### underlying

```solidity
function underlying() external nonpayable returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined



## Events

### Approval

```solidity
event Approval(address indexed _owner, address indexed _spender, uint256 _value)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _owner `indexed` | address | undefined |
| _spender `indexed` | address | undefined |
| _value  | uint256 | undefined |



