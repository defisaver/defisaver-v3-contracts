# DFSExchangeCore









## Methods

### ERR_DEST_AMOUNT_MISSING

```solidity
function ERR_DEST_AMOUNT_MISSING() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### ERR_NOT_ZEROX_EXCHANGE

```solidity
function ERR_NOT_ZEROX_EXCHANGE() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### ERR_OFFCHAIN_DATA_INVALID

```solidity
function ERR_OFFCHAIN_DATA_INVALID() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### ERR_SLIPPAGE_HIT

```solidity
function ERR_SLIPPAGE_HIT() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### ERR_WRAPPER_INVALID

```solidity
function ERR_WRAPPER_INVALID() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### feeRecipient

```solidity
function feeRecipient() external view returns (contract FeeRecipient)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract FeeRecipient | undefined

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




