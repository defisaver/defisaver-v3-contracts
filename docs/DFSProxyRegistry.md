# DFSProxyRegistry



> Checks Mcd registry and replaces the proxy addr if owner changed





## Methods

### addAdditionalProxy

```solidity
function addAdditionalProxy(address _user, address _proxy) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | undefined
| _proxy | address | undefined

### additionalProxies

```solidity
function additionalProxies(address, uint256) external view returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined
| _1 | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### adminVault

```solidity
function adminVault() external view returns (contract AdminVault)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract AdminVault | undefined

### changeMcdOwner

```solidity
function changeMcdOwner(address _user, address _proxy) external nonpayable
```

Changes the proxy that is returned for the user

*Used when the user changed DSProxy ownership himself*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | undefined
| _proxy | address | undefined

### changedOwners

```solidity
function changedOwners(address) external view returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### getAllProxies

```solidity
function getAllProxies(address _user) external view returns (address, address[])
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined
| _1 | address[] | undefined

### getMcdProxy

```solidity
function getMcdProxy(address _user) external view returns (address)
```

Returns the proxy address associated with the user account

*If user changed ownership of DSProxy admin can hardcode replacement*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### kill

```solidity
function kill() external nonpayable
```

Destroy the contract




### mcdRegistry

```solidity
function mcdRegistry() external view returns (contract IProxyRegistry)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IProxyRegistry | undefined

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




