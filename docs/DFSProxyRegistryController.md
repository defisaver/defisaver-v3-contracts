# DFSProxyRegistryController



> User facing contract to manage new proxies (is owner of DFSProxyRegistry)





## Methods

### addNewProxy

```solidity
function addNewProxy() external nonpayable returns (address)
```

User calls from EOA to build a new DFS registred proxy




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### addToPool

```solidity
function addToPool(uint256 _numNewProxies) external nonpayable
```

Adds proxies to pool for users to later claim and save on gas



#### Parameters

| Name | Type | Description |
|---|---|---|
| _numNewProxies | uint256 | undefined

### adminVault

```solidity
function adminVault() external view returns (contract AdminVault)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract AdminVault | undefined

### changeOwnerInDFSRegistry

```solidity
function changeOwnerInDFSRegistry(address _newOwner) external nonpayable
```

Will change owner of proxy in DFSRegistry

*Still need to .setOwner() in DSProxy firstmsg.sender == DSProxy which calls this method*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _newOwner | address | undefined

### getProxies

```solidity
function getProxies(address _user) external view returns (address[])
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address[] | undefined

### getProxyPoolCount

```solidity
function getProxyPoolCount() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### kill

```solidity
function kill() external nonpayable
```

Destroy the contract




### proxyPool

```solidity
function proxyPool(uint256) external view returns (address)
```



*List of prebuild proxies the users can claim to save gas*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

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



## Events

### ChangedOwner

```solidity
event ChangedOwner(address, address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0  | address | undefined |
| _1  | address | undefined |

### NewProxy

```solidity
event NewProxy(address, address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0  | address | undefined |
| _1  | address | undefined |



