# IDFSRegistry









## Methods

### addNewContract

```solidity
function addNewContract(bytes32 _id, address _contractAddr, uint256 _waitPeriod) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _id | bytes32 | undefined
| _contractAddr | address | undefined
| _waitPeriod | uint256 | undefined

### approveContractChange

```solidity
function approveContractChange(bytes32 _id) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _id | bytes32 | undefined

### cancelContractChange

```solidity
function cancelContractChange(bytes32 _id) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _id | bytes32 | undefined

### changeWaitPeriod

```solidity
function changeWaitPeriod(bytes32 _id, uint256 _newWaitPeriod) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _id | bytes32 | undefined
| _newWaitPeriod | uint256 | undefined

### getAddr

```solidity
function getAddr(bytes32 _id) external view returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _id | bytes32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### startContractChange

```solidity
function startContractChange(bytes32 _id, address _newContractAddr) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _id | bytes32 | undefined
| _newContractAddr | address | undefined




