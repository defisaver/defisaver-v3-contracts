# ZrxAllowlist









## Methods

### adminVault

```solidity
function adminVault() external view returns (contract AdminVault)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract AdminVault | undefined

### isZrxAddr

```solidity
function isZrxAddr(address _zrxAddr) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _zrxAddr | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### kill

```solidity
function kill() external nonpayable
```

Destroy the contract




### setAllowlistAddr

```solidity
function setAllowlistAddr(address _zrxAddr, bool _state) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _zrxAddr | address | undefined
| _state | bool | undefined

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

### zrxAllowlist

```solidity
function zrxAllowlist(address) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined




