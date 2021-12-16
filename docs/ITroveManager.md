# ITroveManager









## Methods

### addTroveOwnerToArray

```solidity
function addTroveOwnerToArray(address _borrower) external nonpayable returns (uint256 index)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| index | uint256 | undefined

### applyPendingRewards

```solidity
function applyPendingRewards(address _borrower) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower | address | undefined

### batchLiquidateTroves

```solidity
function batchLiquidateTroves(address[] _troveArray) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _troveArray | address[] | undefined

### checkRecoveryMode

```solidity
function checkRecoveryMode(uint256 _price) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _price | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### closeTrove

```solidity
function closeTrove(address _borrower) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower | address | undefined

### decayBaseRateFromBorrowing

```solidity
function decayBaseRateFromBorrowing() external nonpayable
```






### decreaseTroveColl

```solidity
function decreaseTroveColl(address _borrower, uint256 _collDecrease) external nonpayable returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower | address | undefined
| _collDecrease | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### decreaseTroveDebt

```solidity
function decreaseTroveDebt(address _borrower, uint256 _collDecrease) external nonpayable returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower | address | undefined
| _collDecrease | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getBorrowingFee

```solidity
function getBorrowingFee(uint256 LUSDDebt) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| LUSDDebt | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getBorrowingFeeWithDecay

```solidity
function getBorrowingFeeWithDecay(uint256 _LUSDDebt) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _LUSDDebt | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getBorrowingRate

```solidity
function getBorrowingRate() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getBorrowingRateWithDecay

```solidity
function getBorrowingRateWithDecay() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getCurrentICR

```solidity
function getCurrentICR(address _borrower, uint256 _price) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower | address | undefined
| _price | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getEntireDebtAndColl

```solidity
function getEntireDebtAndColl(address _borrower) external view returns (uint256 debt, uint256 coll, uint256 pendingLUSDDebtReward, uint256 pendingETHReward)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| debt | uint256 | undefined
| coll | uint256 | undefined
| pendingLUSDDebtReward | uint256 | undefined
| pendingETHReward | uint256 | undefined

### getNominalICR

```solidity
function getNominalICR(address _borrower) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getPendingETHReward

```solidity
function getPendingETHReward(address _borrower) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getPendingLUSDDebtReward

```solidity
function getPendingLUSDDebtReward(address _borrower) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getRedemptionFeeWithDecay

```solidity
function getRedemptionFeeWithDecay(uint256 _ETHDrawn) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _ETHDrawn | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getRedemptionRate

```solidity
function getRedemptionRate() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getRedemptionRateWithDecay

```solidity
function getRedemptionRateWithDecay() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getTCR

```solidity
function getTCR(uint256 _price) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _price | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getTroveColl

```solidity
function getTroveColl(address _borrower) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getTroveDebt

```solidity
function getTroveDebt(address _borrower) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getTroveFromTroveOwnersArray

```solidity
function getTroveFromTroveOwnersArray(uint256 _index) external view returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _index | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### getTroveOwnersCount

```solidity
function getTroveOwnersCount() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getTroveStake

```solidity
function getTroveStake(address _borrower) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getTroveStatus

```solidity
function getTroveStatus(address _borrower) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### hasPendingRewards

```solidity
function hasPendingRewards(address _borrower) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### increaseTroveColl

```solidity
function increaseTroveColl(address _borrower, uint256 _collIncrease) external nonpayable returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower | address | undefined
| _collIncrease | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### increaseTroveDebt

```solidity
function increaseTroveDebt(address _borrower, uint256 _debtIncrease) external nonpayable returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower | address | undefined
| _debtIncrease | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### liquidate

```solidity
function liquidate(address _borrower) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower | address | undefined

### liquidateTroves

```solidity
function liquidateTroves(uint256 _n) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _n | uint256 | undefined

### redeemCollateral

```solidity
function redeemCollateral(uint256 _LUSDAmount, address _firstRedemptionHint, address _upperPartialRedemptionHint, address _lowerPartialRedemptionHint, uint256 _partialRedemptionHintNICR, uint256 _maxIterations, uint256 _maxFee) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _LUSDAmount | uint256 | undefined
| _firstRedemptionHint | address | undefined
| _upperPartialRedemptionHint | address | undefined
| _lowerPartialRedemptionHint | address | undefined
| _partialRedemptionHintNICR | uint256 | undefined
| _maxIterations | uint256 | undefined
| _maxFee | uint256 | undefined

### removeStake

```solidity
function removeStake(address _borrower) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower | address | undefined

### setTroveStatus

```solidity
function setTroveStatus(address _borrower, uint256 num) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower | address | undefined
| num | uint256 | undefined

### updateStakeAndTotalStakes

```solidity
function updateStakeAndTotalStakes(address _borrower) external nonpayable returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### updateTroveRewardSnapshots

```solidity
function updateTroveRewardSnapshots(address _borrower) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower | address | undefined



## Events

### ActivePoolAddressChanged

```solidity
event ActivePoolAddressChanged(address _activePoolAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _activePoolAddress  | address | undefined |

### BaseRateUpdated

```solidity
event BaseRateUpdated(uint256 _baseRate)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _baseRate  | uint256 | undefined |

### BorrowerOperationsAddressChanged

```solidity
event BorrowerOperationsAddressChanged(address _newBorrowerOperationsAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _newBorrowerOperationsAddress  | address | undefined |

### CollSurplusPoolAddressChanged

```solidity
event CollSurplusPoolAddressChanged(address _collSurplusPoolAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _collSurplusPoolAddress  | address | undefined |

### DefaultPoolAddressChanged

```solidity
event DefaultPoolAddressChanged(address _defaultPoolAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _defaultPoolAddress  | address | undefined |

### GasPoolAddressChanged

```solidity
event GasPoolAddressChanged(address _gasPoolAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _gasPoolAddress  | address | undefined |

### LQTYStakingAddressChanged

```solidity
event LQTYStakingAddressChanged(address _lqtyStakingAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _lqtyStakingAddress  | address | undefined |

### LQTYTokenAddressChanged

```solidity
event LQTYTokenAddressChanged(address _lqtyTokenAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _lqtyTokenAddress  | address | undefined |

### LTermsUpdated

```solidity
event LTermsUpdated(uint256 _L_ETH, uint256 _L_LUSDDebt)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _L_ETH  | uint256 | undefined |
| _L_LUSDDebt  | uint256 | undefined |

### LUSDTokenAddressChanged

```solidity
event LUSDTokenAddressChanged(address _newLUSDTokenAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _newLUSDTokenAddress  | address | undefined |

### LastFeeOpTimeUpdated

```solidity
event LastFeeOpTimeUpdated(uint256 _lastFeeOpTime)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _lastFeeOpTime  | uint256 | undefined |

### Liquidation

```solidity
event Liquidation(uint256 _liquidatedDebt, uint256 _liquidatedColl, uint256 _collGasCompensation, uint256 _LUSDGasCompensation)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _liquidatedDebt  | uint256 | undefined |
| _liquidatedColl  | uint256 | undefined |
| _collGasCompensation  | uint256 | undefined |
| _LUSDGasCompensation  | uint256 | undefined |

### PriceFeedAddressChanged

```solidity
event PriceFeedAddressChanged(address _newPriceFeedAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _newPriceFeedAddress  | address | undefined |

### Redemption

```solidity
event Redemption(uint256 _attemptedLUSDAmount, uint256 _actualLUSDAmount, uint256 _ETHSent, uint256 _ETHFee)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _attemptedLUSDAmount  | uint256 | undefined |
| _actualLUSDAmount  | uint256 | undefined |
| _ETHSent  | uint256 | undefined |
| _ETHFee  | uint256 | undefined |

### SortedTrovesAddressChanged

```solidity
event SortedTrovesAddressChanged(address _sortedTrovesAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _sortedTrovesAddress  | address | undefined |

### StabilityPoolAddressChanged

```solidity
event StabilityPoolAddressChanged(address _stabilityPoolAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _stabilityPoolAddress  | address | undefined |

### SystemSnapshotsUpdated

```solidity
event SystemSnapshotsUpdated(uint256 _totalStakesSnapshot, uint256 _totalCollateralSnapshot)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _totalStakesSnapshot  | uint256 | undefined |
| _totalCollateralSnapshot  | uint256 | undefined |

### TotalStakesUpdated

```solidity
event TotalStakesUpdated(uint256 _newTotalStakes)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _newTotalStakes  | uint256 | undefined |

### TroveIndexUpdated

```solidity
event TroveIndexUpdated(address _borrower, uint256 _newIndex)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower  | address | undefined |
| _newIndex  | uint256 | undefined |

### TroveLiquidated

```solidity
event TroveLiquidated(address indexed _borrower, uint256 _debt, uint256 _coll, uint8 operation)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower `indexed` | address | undefined |
| _debt  | uint256 | undefined |
| _coll  | uint256 | undefined |
| operation  | uint8 | undefined |

### TroveSnapshotsUpdated

```solidity
event TroveSnapshotsUpdated(uint256 _L_ETH, uint256 _L_LUSDDebt)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _L_ETH  | uint256 | undefined |
| _L_LUSDDebt  | uint256 | undefined |

### TroveUpdated

```solidity
event TroveUpdated(address indexed _borrower, uint256 _debt, uint256 _coll, uint256 stake, uint8 operation)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower `indexed` | address | undefined |
| _debt  | uint256 | undefined |
| _coll  | uint256 | undefined |
| stake  | uint256 | undefined |
| operation  | uint8 | undefined |



