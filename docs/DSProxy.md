# DSProxy









## Methods

### authority

```solidity
function authority() external view returns (contract DSAuthority)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract DSAuthority | undefined

### cache

```solidity
function cache() external view returns (contract DSProxyCache)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract DSProxyCache | undefined

### execute

```solidity
function execute(bytes _code, bytes _data) external payable returns (address target, bytes32 response)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _code | bytes | undefined
| _data | bytes | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| target | address | undefined
| response | bytes32 | undefined

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

### setCache

```solidity
function setCache(address _cacheAddr) external payable returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _cacheAddr | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### setOwner

```solidity
function setOwner(address owner_) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| owner_ | address | undefined



## Events

### LogNote

```solidity
event LogNote(bytes4 indexed sig, address indexed guy, bytes32 indexed foo, bytes32 indexed bar, uint256 wad, bytes fax)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| sig `indexed` | bytes4 | undefined |
| guy `indexed` | address | undefined |
| foo `indexed` | bytes32 | undefined |
| bar `indexed` | bytes32 | undefined |
| wad  | uint256 | undefined |
| fax  | bytes | undefined |

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



