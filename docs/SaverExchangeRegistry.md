# SaverExchangeRegistry









## Methods

### addWrapper

```solidity
function addWrapper(address _wrapper) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _wrapper | address | undefined

### adminVault

```solidity
function adminVault() external view returns (contract AdminVault)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract AdminVault | undefined

### isWrapper

```solidity
function isWrapper(address _wrapper) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _wrapper | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### kill

```solidity
function kill() external nonpayable
```

Destroy the contract




### removeWrapper

```solidity
function removeWrapper(address _wrapper) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _wrapper | address | undefined

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




