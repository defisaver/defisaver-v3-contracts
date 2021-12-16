# TokenBalanceTrigger









## Methods

### adminVault

```solidity
function adminVault() external view returns (contract AdminVault)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract AdminVault | undefined

### isTriggered

```solidity
function isTriggered(bytes, bytes _subData) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | bytes | undefined
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
function parseSubData(bytes _data) external pure returns (address, address, uint256, enum TokenBalanceTrigger.BalanceState)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _data | bytes | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined
| _1 | address | undefined
| _2 | uint256 | undefined
| _3 | enum TokenBalanceTrigger.BalanceState | undefined

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




