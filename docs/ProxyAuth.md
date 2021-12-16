# ProxyAuth



> ProxyAuth Gets DSProxy auth from users and is callable by the Executor





## Methods

### ERR_SENDER_NOT_EXECUTOR

```solidity
function ERR_SENDER_NOT_EXECUTOR() external view returns (string)
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

### callExecute

```solidity
function callExecute(address _proxyAddr, address _contractAddr, bytes _data) external payable
```

Calls the .execute() method of the specified users DSProxy

*Contract gets the authority from the user to call it, only callable by Executor*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _proxyAddr | address | Address of the users DSProxy
| _contractAddr | address | Address of the contract which to execute
| _data | bytes | Call data of the function to be called

### kill

```solidity
function kill() external nonpayable
```

Destroy the contract




### registry

```solidity
function registry() external view returns (contract IDFSRegistry)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IDFSRegistry | undefined

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




