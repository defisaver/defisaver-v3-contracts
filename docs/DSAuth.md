# DSAuth









## Methods

### authority

```solidity
function authority() external view returns (contract DSAuthority)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract DSAuthority | undefined

### owner

```solidity
function owner() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### setAuthority

```solidity
function setAuthority(contract DSAuthority authority_) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| authority_ | contract DSAuthority | undefined

### setOwner

```solidity
function setOwner(address owner_) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| owner_ | address | undefined



## Events

### LogSetAuthority

```solidity
event LogSetAuthority(address indexed authority)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| authority `indexed` | address | undefined |

### LogSetOwner

```solidity
event LogSetOwner(address indexed owner)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| owner `indexed` | address | undefined |



