# KyberNetworkProxyInterface









## Methods

### enabled

```solidity
function enabled() external view returns (bool)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### getExpectedRate

```solidity
function getExpectedRate(contract IERC20 src, contract IERC20 dest, uint256 srcQty) external view returns (uint256 expectedRate, uint256 slippageRate)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| src | contract IERC20 | undefined
| dest | contract IERC20 | undefined
| srcQty | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| expectedRate | uint256 | undefined
| slippageRate | uint256 | undefined

### getUserCapInTokenWei

```solidity
function getUserCapInTokenWei(address user, contract IERC20 token) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | undefined
| token | contract IERC20 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getUserCapInWei

```solidity
function getUserCapInWei(address user) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### info

```solidity
function info(bytes32 id) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| id | bytes32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### maxGasPrice

```solidity
function maxGasPrice() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### swapEtherToToken

```solidity
function swapEtherToToken(contract IERC20 token, uint256 minConversionRate) external payable returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token | contract IERC20 | undefined
| minConversionRate | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### swapTokenToEther

```solidity
function swapTokenToEther(contract IERC20 token, uint256 tokenQty, uint256 minRate) external payable returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token | contract IERC20 | undefined
| tokenQty | uint256 | undefined
| minRate | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### swapTokenToToken

```solidity
function swapTokenToToken(contract IERC20 src, uint256 srcAmount, contract IERC20 dest, uint256 minConversionRate) external nonpayable returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| src | contract IERC20 | undefined
| srcAmount | uint256 | undefined
| dest | contract IERC20 | undefined
| minConversionRate | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### trade

```solidity
function trade(contract IERC20 src, uint256 srcAmount, contract IERC20 dest, address destAddress, uint256 maxDestAmount, uint256 minConversionRate, address walletId) external payable returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| src | contract IERC20 | undefined
| srcAmount | uint256 | undefined
| dest | contract IERC20 | undefined
| destAddress | address | undefined
| maxDestAmount | uint256 | undefined
| minConversionRate | uint256 | undefined
| walletId | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### tradeWithHint

```solidity
function tradeWithHint(contract IERC20 src, uint256 srcAmount, contract IERC20 dest, address destAddress, uint256 maxDestAmount, uint256 minConversionRate, address walletId, bytes hint) external payable returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| src | contract IERC20 | undefined
| srcAmount | uint256 | undefined
| dest | contract IERC20 | undefined
| destAddress | address | undefined
| maxDestAmount | uint256 | undefined
| minConversionRate | uint256 | undefined
| walletId | address | undefined
| hint | bytes | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined




