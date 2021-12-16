# DFSRegistry









## Methods

### ERR_ALREADY_IN_CONTRACT_CHANGE

```solidity
function ERR_ALREADY_IN_CONTRACT_CHANGE() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### ERR_ALREADY_IN_WAIT_PERIOD_CHANGE

```solidity
function ERR_ALREADY_IN_WAIT_PERIOD_CHANGE() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### ERR_CHANGE_NOT_READY

```solidity
function ERR_CHANGE_NOT_READY() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### ERR_EMPTY_PREV_ADDR

```solidity
function ERR_EMPTY_PREV_ADDR() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### ERR_ENTRY_ALREADY_EXISTS

```solidity
function ERR_ENTRY_ALREADY_EXISTS() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### ERR_ENTRY_NON_EXISTENT

```solidity
function ERR_ENTRY_NON_EXISTENT() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### ERR_ENTRY_NOT_IN_CHANGE

```solidity
function ERR_ENTRY_NOT_IN_CHANGE() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### ERR_WAIT_PERIOD_SHORTER

```solidity
function ERR_WAIT_PERIOD_SHORTER() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### addNewContract

```solidity
function addNewContract(bytes32 _id, address _contractAddr, uint256 _waitPeriod) external nonpayable
```

Adds a new contract to the registry



#### Parameters

| Name | Type | Description |
|---|---|---|
| _id | bytes32 | Id of contract
| _contractAddr | address | Address of the contract
| _waitPeriod | uint256 | Amount of time to wait before a contract address can be changed

### adminVault

```solidity
function adminVault() external view returns (contract AdminVault)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract AdminVault | undefined

### approveContractChange

```solidity
function approveContractChange(bytes32 _id) external nonpayable
```

Changes new contract address, correct time must have passed



#### Parameters

| Name | Type | Description |
|---|---|---|
| _id | bytes32 | Id of contract

### approveWaitPeriodChange

```solidity
function approveWaitPeriodChange(bytes32 _id) external nonpayable
```

Changes new wait period, correct time must have passed



#### Parameters

| Name | Type | Description |
|---|---|---|
| _id | bytes32 | Id of contract

### cancelContractChange

```solidity
function cancelContractChange(bytes32 _id) external nonpayable
```

Cancel pending change



#### Parameters

| Name | Type | Description |
|---|---|---|
| _id | bytes32 | Id of contract

### cancelWaitPeriodChange

```solidity
function cancelWaitPeriodChange(bytes32 _id) external nonpayable
```

Cancel wait period change



#### Parameters

| Name | Type | Description |
|---|---|---|
| _id | bytes32 | Id of contract

### entries

```solidity
function entries(bytes32) external view returns (address contractAddr, uint256 waitPeriod, uint256 changeStartTime, bool inContractChange, bool inWaitPeriodChange, bool exists)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| contractAddr | address | undefined
| waitPeriod | uint256 | undefined
| changeStartTime | uint256 | undefined
| inContractChange | bool | undefined
| inWaitPeriodChange | bool | undefined
| exists | bool | undefined

### getAddr

```solidity
function getAddr(bytes32 _id) external view returns (address)
```

Given an contract id returns the registered address

*Id is keccak256 of the contract name*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _id | bytes32 | Id of contract

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### isRegistered

```solidity
function isRegistered(bytes32 _id) external view returns (bool)
```

Helper function to easily query if id is registered



#### Parameters

| Name | Type | Description |
|---|---|---|
| _id | bytes32 | Id of contract

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### kill

```solidity
function kill() external nonpayable
```

Destroy the contract




### logger

```solidity
function logger() external view returns (contract DefisaverLogger)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract DefisaverLogger | undefined

### pendingAddresses

```solidity
function pendingAddresses(bytes32) external view returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### pendingWaitTimes

```solidity
function pendingWaitTimes(bytes32) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### previousAddresses

```solidity
function previousAddresses(bytes32) external view returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### revertToPreviousAddress

```solidity
function revertToPreviousAddress(bytes32 _id) external nonpayable
```

Reverts to the previous address immediately

*In case the new version has a fault, a quick way to fallback to the old contract*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _id | bytes32 | Id of contract

### startContractChange

```solidity
function startContractChange(bytes32 _id, address _newContractAddr) external nonpayable
```

Starts an address change for an existing entry

*Can override a change that is currently in progress*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _id | bytes32 | Id of contract
| _newContractAddr | address | Address of the new contract

### startWaitPeriodChange

```solidity
function startWaitPeriodChange(bytes32 _id, uint256 _newWaitPeriod) external nonpayable
```

Starts the change for waitPeriod



#### Parameters

| Name | Type | Description |
|---|---|---|
| _id | bytes32 | Id of contract
| _newWaitPeriod | uint256 | New wait time

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




