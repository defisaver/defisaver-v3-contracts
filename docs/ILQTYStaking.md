# ILQTYStaking









## Methods

### getPendingETHGain

```solidity
function getPendingETHGain(address _user) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getPendingLUSDGain

```solidity
function getPendingLUSDGain(address _user) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### increaseF_ETH

```solidity
function increaseF_ETH(uint256 _ETHFee) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _ETHFee | uint256 | undefined

### increaseF_LUSD

```solidity
function increaseF_LUSD(uint256 _LQTYFee) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _LQTYFee | uint256 | undefined

### setAddresses

```solidity
function setAddresses(address _lqtyTokenAddress, address _lusdTokenAddress, address _troveManagerAddress, address _borrowerOperationsAddress, address _activePoolAddress) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _lqtyTokenAddress | address | undefined
| _lusdTokenAddress | address | undefined
| _troveManagerAddress | address | undefined
| _borrowerOperationsAddress | address | undefined
| _activePoolAddress | address | undefined

### stake

```solidity
function stake(uint256 _LQTYamount) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _LQTYamount | uint256 | undefined

### stakes

```solidity
function stakes(address) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### unstake

```solidity
function unstake(uint256 _LQTYamount) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _LQTYamount | uint256 | undefined



## Events

### ActivePoolAddressSet

```solidity
event ActivePoolAddressSet(address _activePoolAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _activePoolAddress  | address | undefined |

### BorrowerOperationsAddressSet

```solidity
event BorrowerOperationsAddressSet(address _borrowerOperationsAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrowerOperationsAddress  | address | undefined |

### EtherSent

```solidity
event EtherSent(address _account, uint256 _amount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _account  | address | undefined |
| _amount  | uint256 | undefined |

### F_ETHUpdated

```solidity
event F_ETHUpdated(uint256 _F_ETH)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _F_ETH  | uint256 | undefined |

### F_LUSDUpdated

```solidity
event F_LUSDUpdated(uint256 _F_LUSD)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _F_LUSD  | uint256 | undefined |

### LQTYTokenAddressSet

```solidity
event LQTYTokenAddressSet(address _lqtyTokenAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _lqtyTokenAddress  | address | undefined |

### LUSDTokenAddressSet

```solidity
event LUSDTokenAddressSet(address _lusdTokenAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _lusdTokenAddress  | address | undefined |

### StakeChanged

```solidity
event StakeChanged(address indexed staker, uint256 newStake)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| staker `indexed` | address | undefined |
| newStake  | uint256 | undefined |

### StakerSnapshotsUpdated

```solidity
event StakerSnapshotsUpdated(address _staker, uint256 _F_ETH, uint256 _F_LUSD)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _staker  | address | undefined |
| _F_ETH  | uint256 | undefined |
| _F_LUSD  | uint256 | undefined |

### StakingGainsWithdrawn

```solidity
event StakingGainsWithdrawn(address indexed staker, uint256 LUSDGain, uint256 ETHGain)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| staker `indexed` | address | undefined |
| LUSDGain  | uint256 | undefined |
| ETHGain  | uint256 | undefined |

### TotalLQTYStakedUpdated

```solidity
event TotalLQTYStakedUpdated(uint256 _totalLQTYStaked)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _totalLQTYStaked  | uint256 | undefined |

### TroveManagerAddressSet

```solidity
event TroveManagerAddressSet(address _troveManager)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _troveManager  | address | undefined |



