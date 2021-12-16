# BotAuth



> Handles authorization of who can call the execution of strategies





## Methods

### addCaller

```solidity
function addCaller(address _caller) external nonpayable
```

Adds a new bot address which will be able to call repay/boost



#### Parameters

| Name | Type | Description |
|---|---|---|
| _caller | address | Bot address

### adminVault

```solidity
function adminVault() external view returns (contract AdminVault)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract AdminVault | undefined

### approvedCallers

```solidity
function approvedCallers(address) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### isApproved

```solidity
function isApproved(uint256, address _caller) external view returns (bool)
```

Checks if the caller is approved for the specific strategy

*Currently auth callers are approved for all strategies*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined
| _caller | address | Address of the caller

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### kill

```solidity
function kill() external nonpayable
```

Destroy the contract




### removeCaller

```solidity
function removeCaller(address _caller) external nonpayable
```

Removes a bot address so it can&#39;t call repay/boost



#### Parameters

| Name | Type | Description |
|---|---|---|
| _caller | address | Bot address

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




