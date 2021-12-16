# McdRatioTrigger









## Methods

### adminVault

```solidity
function adminVault() external view returns (contract AdminVault)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract AdminVault | undefined

### getCdpInfo

```solidity
function getCdpInfo(uint256 _cdpId, bytes32 _ilk) external view returns (uint256, uint256)
```

Gets CDP info (collateral, debt)



#### Parameters

| Name | Type | Description |
|---|---|---|
| _cdpId | uint256 | Id of the CDP
| _ilk | bytes32 | Ilk of the CDP

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined
| _1 | uint256 | undefined

### getPrice

```solidity
function getPrice(bytes32 _ilk) external view returns (uint256)
```

Gets a price of the asset



#### Parameters

| Name | Type | Description |
|---|---|---|
| _ilk | bytes32 | Ilk of the CDP

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getRatio

```solidity
function getRatio(uint256 _cdpId, uint256 _nextPrice) external view returns (uint256)
```

Gets CDP ratio



#### Parameters

| Name | Type | Description |
|---|---|---|
| _cdpId | uint256 | Id of the CDP
| _nextPrice | uint256 | Next price for user

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### isTriggered

```solidity
function isTriggered(bytes _callData, bytes _subData) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _callData | bytes | undefined
| _subData | bytes | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### kill

```solidity
function kill() external nonpayable
```

Destroy the contract




### manager

```solidity
function manager() external view returns (contract IManager)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IManager | undefined

### parseParamData

```solidity
function parseParamData(bytes _data) external pure returns (uint256 nextPrice)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _data | bytes | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| nextPrice | uint256 | undefined

### parseSubData

```solidity
function parseSubData(bytes _data) external pure returns (uint256, uint256, enum McdRatioTrigger.RatioState)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _data | bytes | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined
| _1 | uint256 | undefined
| _2 | enum McdRatioTrigger.RatioState | undefined

### spotter

```solidity
function spotter() external view returns (contract ISpotter)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract ISpotter | undefined

### vat

```solidity
function vat() external view returns (contract IVat)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IVat | undefined

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




