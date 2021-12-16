# IBorrowerOperations









## Methods

### addColl

```solidity
function addColl(address _upperHint, address _lowerHint) external payable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _upperHint | address | undefined
| _lowerHint | address | undefined

### adjustTrove

```solidity
function adjustTrove(uint256 _maxFee, uint256 _collWithdrawal, uint256 _debtChange, bool isDebtIncrease, address _upperHint, address _lowerHint) external payable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _maxFee | uint256 | undefined
| _collWithdrawal | uint256 | undefined
| _debtChange | uint256 | undefined
| isDebtIncrease | bool | undefined
| _upperHint | address | undefined
| _lowerHint | address | undefined

### claimCollateral

```solidity
function claimCollateral() external nonpayable
```






### closeTrove

```solidity
function closeTrove() external nonpayable
```






### getCompositeDebt

```solidity
function getCompositeDebt(uint256 _debt) external pure returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _debt | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### moveETHGainToTrove

```solidity
function moveETHGainToTrove(address _user, address _upperHint, address _lowerHint) external payable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | undefined
| _upperHint | address | undefined
| _lowerHint | address | undefined

### openTrove

```solidity
function openTrove(uint256 _maxFee, uint256 _LUSDAmount, address _upperHint, address _lowerHint) external payable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _maxFee | uint256 | undefined
| _LUSDAmount | uint256 | undefined
| _upperHint | address | undefined
| _lowerHint | address | undefined

### repayLUSD

```solidity
function repayLUSD(uint256 _amount, address _upperHint, address _lowerHint) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _amount | uint256 | undefined
| _upperHint | address | undefined
| _lowerHint | address | undefined

### withdrawColl

```solidity
function withdrawColl(uint256 _amount, address _upperHint, address _lowerHint) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _amount | uint256 | undefined
| _upperHint | address | undefined
| _lowerHint | address | undefined

### withdrawLUSD

```solidity
function withdrawLUSD(uint256 _maxFee, uint256 _amount, address _upperHint, address _lowerHint) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _maxFee | uint256 | undefined
| _amount | uint256 | undefined
| _upperHint | address | undefined
| _lowerHint | address | undefined



## Events

### ActivePoolAddressChanged

```solidity
event ActivePoolAddressChanged(address _activePoolAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _activePoolAddress  | address | undefined |

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

### LUSDBorrowingFeePaid

```solidity
event LUSDBorrowingFeePaid(address indexed _borrower, uint256 _LUSDFee)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower `indexed` | address | undefined |
| _LUSDFee  | uint256 | undefined |

### LUSDTokenAddressChanged

```solidity
event LUSDTokenAddressChanged(address _lusdTokenAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _lusdTokenAddress  | address | undefined |

### PriceFeedAddressChanged

```solidity
event PriceFeedAddressChanged(address _newPriceFeedAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _newPriceFeedAddress  | address | undefined |

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

### TroveCreated

```solidity
event TroveCreated(address indexed _borrower, uint256 arrayIndex)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _borrower `indexed` | address | undefined |
| arrayIndex  | uint256 | undefined |

### TroveManagerAddressChanged

```solidity
event TroveManagerAddressChanged(address _newTroveManagerAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _newTroveManagerAddress  | address | undefined |

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



