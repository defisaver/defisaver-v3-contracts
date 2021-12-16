# ISortedTroves









## Methods

### contains

```solidity
function contains(address _id) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _id | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### findInsertPosition

```solidity
function findInsertPosition(uint256 _ICR, address _prevId, address _nextId) external view returns (address, address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _ICR | uint256 | undefined
| _prevId | address | undefined
| _nextId | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined
| _1 | address | undefined

### getFirst

```solidity
function getFirst() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### getLast

```solidity
function getLast() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### getMaxSize

```solidity
function getMaxSize() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getNext

```solidity
function getNext(address _id) external view returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _id | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### getPrev

```solidity
function getPrev(address _id) external view returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _id | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### getSize

```solidity
function getSize() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### insert

```solidity
function insert(address _id, uint256 _ICR, address _prevId, address _nextId) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _id | address | undefined
| _ICR | uint256 | undefined
| _prevId | address | undefined
| _nextId | address | undefined

### isEmpty

```solidity
function isEmpty() external view returns (bool)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### isFull

```solidity
function isFull() external view returns (bool)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### reInsert

```solidity
function reInsert(address _id, uint256 _newICR, address _prevId, address _nextId) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _id | address | undefined
| _newICR | uint256 | undefined
| _prevId | address | undefined
| _nextId | address | undefined

### remove

```solidity
function remove(address _id) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _id | address | undefined

### setParams

```solidity
function setParams(uint256 _size, address _TroveManagerAddress, address _borrowerOperationsAddress) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _size | uint256 | undefined
| _TroveManagerAddress | address | undefined
| _borrowerOperationsAddress | address | undefined

### validInsertPosition

```solidity
function validInsertPosition(uint256 _ICR, address _prevId, address _nextId) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _ICR | uint256 | undefined
| _prevId | address | undefined
| _nextId | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined



## Events

### BorrowerOperationsAddressChanged

```solidity
event BorrowerOperationsAddressChanged(address _borrowerOperationsAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrowerOperationsAddress  | address | undefined |

### NodeAdded

```solidity
event NodeAdded(address _id, uint256 _NICR)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _id  | address | undefined |
| _NICR  | uint256 | undefined |

### NodeRemoved

```solidity
event NodeRemoved(address _id)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _id  | address | undefined |

### SortedTrovesAddressChanged

```solidity
event SortedTrovesAddressChanged(address _sortedDoublyLLAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _sortedDoublyLLAddress  | address | undefined |



