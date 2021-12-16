# ISavingsContractV2









## Methods

### approve

```solidity
function approve(address, uint256) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined
| _1 | uint256 | undefined

### balanceOfUnderlying

```solidity
function balanceOfUnderlying(address _user) external view returns (uint256 balance)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| balance | uint256 | undefined

### creditBalances

```solidity
function creditBalances(address) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### creditsToUnderlying

```solidity
function creditsToUnderlying(uint256 _underlying) external view returns (uint256 credits)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _underlying | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| credits | uint256 | undefined

### depositInterest

```solidity
function depositInterest(uint256 _amount) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _amount | uint256 | undefined

### depositSavings

```solidity
function depositSavings(uint256 _amount) external nonpayable returns (uint256 creditsIssued)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _amount | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| creditsIssued | uint256 | undefined

### exchangeRate

```solidity
function exchangeRate() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### redeem

```solidity
function redeem(uint256 _amount) external nonpayable returns (uint256 massetReturned)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _amount | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| massetReturned | uint256 | undefined

### redeemCredits

```solidity
function redeemCredits(uint256 _amount) external nonpayable returns (uint256 underlyingReturned)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _amount | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| underlyingReturned | uint256 | undefined

### redeemUnderlying

```solidity
function redeemUnderlying(uint256 _amount) external nonpayable returns (uint256 creditsBurned)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _amount | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| creditsBurned | uint256 | undefined

### underlyingToCredits

```solidity
function underlyingToCredits(uint256 _credits) external view returns (uint256 underlying)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _credits | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| underlying | uint256 | undefined




