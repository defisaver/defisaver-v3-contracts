# ICollSurplusPool









## Methods

### accountSurplus

```solidity
function accountSurplus(address _account, uint256 _amount) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _account | address | undefined
| _amount | uint256 | undefined

### claimColl

```solidity
function claimColl(address _account) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _account | address | undefined

### getCollateral

```solidity
function getCollateral(address _account) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _account | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getETH

```solidity
function getETH() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### setAddresses

```solidity
function setAddresses(address _borrowerOperationsAddress, address _troveManagerAddress, address _activePoolAddress) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrowerOperationsAddress | address | undefined
| _troveManagerAddress | address | undefined
| _activePoolAddress | address | undefined



## Events

### ActivePoolAddressChanged

```solidity
event ActivePoolAddressChanged(address _newActivePoolAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _newActivePoolAddress  | address | undefined |

### BorrowerOperationsAddressChanged

```solidity
event BorrowerOperationsAddressChanged(address _newBorrowerOperationsAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _newBorrowerOperationsAddress  | address | undefined |

### CollBalanceUpdated

```solidity
event CollBalanceUpdated(address indexed _account, uint256 _newBalance)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _account `indexed` | address | undefined |
| _newBalance  | uint256 | undefined |

### EtherSent

```solidity
event EtherSent(address _to, uint256 _amount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _to  | address | undefined |
| _amount  | uint256 | undefined |

### TroveManagerAddressChanged

```solidity
event TroveManagerAddressChanged(address _newTroveManagerAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _newTroveManagerAddress  | address | undefined |



