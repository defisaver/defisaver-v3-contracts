# ScpWrapper









## Methods

### ERR_OFFCHAIN_DATA_INVALID

```solidity
function ERR_OFFCHAIN_DATA_INVALID() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### ERR_PROTOCOL_FEE

```solidity
function ERR_PROTOCOL_FEE() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### ERR_SRC_AMOUNT

```solidity
function ERR_SRC_AMOUNT() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### ERR_TOKENS_SWAPPED_ZERO

```solidity
function ERR_TOKENS_SWAPPED_ZERO() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### adminVault

```solidity
function adminVault() external view returns (contract AdminVault)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract AdminVault | undefined

### kill

```solidity
function kill() external nonpayable
```

Destroy the contract




### packExchangeData

```solidity
function packExchangeData(DFSExchangeData.ExchangeData _exData) external pure returns (bytes)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _exData | DFSExchangeData.ExchangeData | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes | undefined

### takeOrder

```solidity
function takeOrder(DFSExchangeData.ExchangeData _exData, enum DFSExchangeData.ExchangeActionType _type) external payable returns (bool success, uint256)
```

Takes order from Scp and returns bool indicating if it is successful



#### Parameters

| Name | Type | Description |
|---|---|---|
| _exData | DFSExchangeData.ExchangeData | Exchange data
| _type | enum DFSExchangeData.ExchangeActionType | Action type (buy or sell)

#### Returns

| Name | Type | Description |
|---|---|---|
| success | bool | undefined
| _1 | uint256 | undefined

### unpackExchangeData

```solidity
function unpackExchangeData(bytes _data) external pure returns (struct DFSExchangeData.ExchangeData _exData)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _data | bytes | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _exData | DFSExchangeData.ExchangeData | undefined

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




