# IOffchainWrapper









## Methods

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





#### Parameters

| Name | Type | Description |
|---|---|---|
| _exData | DFSExchangeData.ExchangeData | undefined
| _type | enum DFSExchangeData.ExchangeActionType | undefined

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




