# IStabilityPool









## Methods

### getCompoundedFrontEndStake

```solidity
function getCompoundedFrontEndStake(address _frontEnd) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _frontEnd | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getCompoundedLUSDDeposit

```solidity
function getCompoundedLUSDDeposit(address _depositor) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _depositor | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getDepositorETHGain

```solidity
function getDepositorETHGain(address _depositor) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _depositor | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getDepositorLQTYGain

```solidity
function getDepositorLQTYGain(address _depositor) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _depositor | address | undefined

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

### getFrontEndLQTYGain

```solidity
function getFrontEndLQTYGain(address _frontEnd) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _frontEnd | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getTotalLUSDDeposits

```solidity
function getTotalLUSDDeposits() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### offset

```solidity
function offset(uint256 _debt, uint256 _coll) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _debt | uint256 | undefined
| _coll | uint256 | undefined

### provideToSP

```solidity
function provideToSP(uint256 _amount, address _frontEndTag) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _amount | uint256 | undefined
| _frontEndTag | address | undefined

### registerFrontEnd

```solidity
function registerFrontEnd(uint256 _kickbackRate) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _kickbackRate | uint256 | undefined

### setAddresses

```solidity
function setAddresses(address _borrowerOperationsAddress, address _troveManagerAddress, address _activePoolAddress, address _lusdTokenAddress, address _sortedTrovesAddress, address _priceFeedAddress, address _communityIssuanceAddress) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrowerOperationsAddress | address | undefined
| _troveManagerAddress | address | undefined
| _activePoolAddress | address | undefined
| _lusdTokenAddress | address | undefined
| _sortedTrovesAddress | address | undefined
| _priceFeedAddress | address | undefined
| _communityIssuanceAddress | address | undefined

### withdrawETHGainToTrove

```solidity
function withdrawETHGainToTrove(address _upperHint, address _lowerHint) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _upperHint | address | undefined
| _lowerHint | address | undefined

### withdrawFromSP

```solidity
function withdrawFromSP(uint256 _amount) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _amount | uint256 | undefined



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

### CommunityIssuanceAddressChanged

```solidity
event CommunityIssuanceAddressChanged(address _newCommunityIssuanceAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _newCommunityIssuanceAddress  | address | undefined |

### DefaultPoolAddressChanged

```solidity
event DefaultPoolAddressChanged(address _newDefaultPoolAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _newDefaultPoolAddress  | address | undefined |

### DepositSnapshotUpdated

```solidity
event DepositSnapshotUpdated(address indexed _depositor, uint256 _P, uint256 _S, uint256 _G)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _depositor `indexed` | address | undefined |
| _P  | uint256 | undefined |
| _S  | uint256 | undefined |
| _G  | uint256 | undefined |

### ETHGainWithdrawn

```solidity
event ETHGainWithdrawn(address indexed _depositor, uint256 _ETH, uint256 _LUSDLoss)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _depositor `indexed` | address | undefined |
| _ETH  | uint256 | undefined |
| _LUSDLoss  | uint256 | undefined |

### EpochUpdated

```solidity
event EpochUpdated(uint128 _currentEpoch)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _currentEpoch  | uint128 | undefined |

### EtherSent

```solidity
event EtherSent(address _to, uint256 _amount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _to  | address | undefined |
| _amount  | uint256 | undefined |

### FrontEndRegistered

```solidity
event FrontEndRegistered(address indexed _frontEnd, uint256 _kickbackRate)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _frontEnd `indexed` | address | undefined |
| _kickbackRate  | uint256 | undefined |

### FrontEndSnapshotUpdated

```solidity
event FrontEndSnapshotUpdated(address indexed _frontEnd, uint256 _P, uint256 _G)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _frontEnd `indexed` | address | undefined |
| _P  | uint256 | undefined |
| _G  | uint256 | undefined |

### FrontEndStakeChanged

```solidity
event FrontEndStakeChanged(address indexed _frontEnd, uint256 _newFrontEndStake, address _depositor)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _frontEnd `indexed` | address | undefined |
| _newFrontEndStake  | uint256 | undefined |
| _depositor  | address | undefined |

### FrontEndTagSet

```solidity
event FrontEndTagSet(address indexed _depositor, address indexed _frontEnd)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _depositor `indexed` | address | undefined |
| _frontEnd `indexed` | address | undefined |

### G_Updated

```solidity
event G_Updated(uint256 _G, uint128 _epoch, uint128 _scale)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _G  | uint256 | undefined |
| _epoch  | uint128 | undefined |
| _scale  | uint128 | undefined |

### LQTYPaidToDepositor

```solidity
event LQTYPaidToDepositor(address indexed _depositor, uint256 _LQTY)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _depositor `indexed` | address | undefined |
| _LQTY  | uint256 | undefined |

### LQTYPaidToFrontEnd

```solidity
event LQTYPaidToFrontEnd(address indexed _frontEnd, uint256 _LQTY)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _frontEnd `indexed` | address | undefined |
| _LQTY  | uint256 | undefined |

### LUSDTokenAddressChanged

```solidity
event LUSDTokenAddressChanged(address _newLUSDTokenAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _newLUSDTokenAddress  | address | undefined |

### P_Updated

```solidity
event P_Updated(uint256 _P)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _P  | uint256 | undefined |

### PriceFeedAddressChanged

```solidity
event PriceFeedAddressChanged(address _newPriceFeedAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _newPriceFeedAddress  | address | undefined |

### S_Updated

```solidity
event S_Updated(uint256 _S, uint128 _epoch, uint128 _scale)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _S  | uint256 | undefined |
| _epoch  | uint128 | undefined |
| _scale  | uint128 | undefined |

### ScaleUpdated

```solidity
event ScaleUpdated(uint128 _currentScale)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _currentScale  | uint128 | undefined |

### SortedTrovesAddressChanged

```solidity
event SortedTrovesAddressChanged(address _newSortedTrovesAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _newSortedTrovesAddress  | address | undefined |

### StabilityPoolETHBalanceUpdated

```solidity
event StabilityPoolETHBalanceUpdated(uint256 _newBalance)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _newBalance  | uint256 | undefined |

### StabilityPoolLUSDBalanceUpdated

```solidity
event StabilityPoolLUSDBalanceUpdated(uint256 _newBalance)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _newBalance  | uint256 | undefined |

### TroveManagerAddressChanged

```solidity
event TroveManagerAddressChanged(address _newTroveManagerAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _newTroveManagerAddress  | address | undefined |

### UserDepositChanged

```solidity
event UserDepositChanged(address indexed _depositor, uint256 _newDeposit)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _depositor `indexed` | address | undefined |
| _newDeposit  | uint256 | undefined |



