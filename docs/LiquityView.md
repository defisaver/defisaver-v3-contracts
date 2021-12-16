# LiquityView









## Methods

### BorrowerOperations

```solidity
function BorrowerOperations() external view returns (contract IBorrowerOperations)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IBorrowerOperations | undefined

### CollSurplusPool

```solidity
function CollSurplusPool() external view returns (contract ICollSurplusPool)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract ICollSurplusPool | undefined

### HintHelpers

```solidity
function HintHelpers() external view returns (contract IHintHelpers)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IHintHelpers | undefined

### LQTYStaking

```solidity
function LQTYStaking() external view returns (contract ILQTYStaking)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract ILQTYStaking | undefined

### LUSD_GAS_COMPENSATION

```solidity
function LUSD_GAS_COMPENSATION() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### PriceFeed

```solidity
function PriceFeed() external view returns (contract IPriceFeed)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IPriceFeed | undefined

### SortedTroves

```solidity
function SortedTroves() external view returns (contract ISortedTroves)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract ISortedTroves | undefined

### StabilityPool

```solidity
function StabilityPool() external view returns (contract IStabilityPool)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IStabilityPool | undefined

### TroveManager

```solidity
function TroveManager() external view returns (contract ITroveManager)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract ITroveManager | undefined

### computeNICR

```solidity
function computeNICR(uint256 _coll, uint256 _debt) external pure returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _coll | uint256 | undefined
| _debt | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### findInsertPosition

```solidity
function findInsertPosition(uint256 _ICR, address _prevId, address _nextId) external view returns (address upperHint, address lowerHint)
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
| upperHint | address | undefined
| lowerHint | address | undefined

### getApproxHint

```solidity
function getApproxHint(uint256 _CR, uint256 _numTrials, uint256 _inputRandomSeed) external view returns (address hintAddress, uint256 diff, uint256 latestRandomSeed)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _CR | uint256 | undefined
| _numTrials | uint256 | undefined
| _inputRandomSeed | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| hintAddress | address | undefined
| diff | uint256 | undefined
| latestRandomSeed | uint256 | undefined

### getDebtInFront

```solidity
function getDebtInFront(address _of, uint256 _acc, uint256 _iterations) external view returns (address next, uint256 debt)
```

Returns the debt in front of the users trove in the sorted list



#### Parameters

| Name | Type | Description |
|---|---|---|
| _of | address | Address of the trove owner
| _acc | uint256 | Accumulated sum used in subsequent calls, 0 for first call
| _iterations | uint256 | Maximum number of troves to traverse

#### Returns

| Name | Type | Description |
|---|---|---|
| next | address | Trove owner address to be used in the subsequent call, address(0) at the end of list
| debt | uint256 | Accumulated debt to be used in the subsequent call

### getDepositorInfo

```solidity
function getDepositorInfo(address _depositor) external view returns (uint256 compoundedLUSD, uint256 ethGain, uint256 lqtyGain)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _depositor | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| compoundedLUSD | uint256 | undefined
| ethGain | uint256 | undefined
| lqtyGain | uint256 | undefined

### getInsertPosition

```solidity
function getInsertPosition(uint256 _collAmount, uint256 _debtAmount, uint256 _numTrials, uint256 _inputRandomSeed) external view returns (address upperHint, address lowerHint)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _collAmount | uint256 | undefined
| _debtAmount | uint256 | undefined
| _numTrials | uint256 | undefined
| _inputRandomSeed | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| upperHint | address | undefined
| lowerHint | address | undefined

### getRedemptionHints

```solidity
function getRedemptionHints(uint256 _LUSDamount, uint256 _price, uint256 _maxIterations) external view returns (address firstRedemptionHint, uint256 partialRedemptionHintNICR, uint256 truncatedLUSDamount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _LUSDamount | uint256 | undefined
| _price | uint256 | undefined
| _maxIterations | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| firstRedemptionHint | address | undefined
| partialRedemptionHintNICR | uint256 | undefined
| truncatedLUSDamount | uint256 | undefined

### getStakeInfo

```solidity
function getStakeInfo(address _user) external view returns (uint256 stake, uint256 ethGain, uint256 lusdGain)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| stake | uint256 | undefined
| ethGain | uint256 | undefined
| lusdGain | uint256 | undefined

### getTroveInfo

```solidity
function getTroveInfo(address _troveOwner) external view returns (uint256 troveStatus, uint256 collAmount, uint256 debtAmount, uint256 collPrice, uint256 TCRatio, bool recoveryMode)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _troveOwner | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| troveStatus | uint256 | undefined
| collAmount | uint256 | undefined
| debtAmount | uint256 | undefined
| collPrice | uint256 | undefined
| TCRatio | uint256 | undefined
| recoveryMode | bool | undefined

### isRecoveryMode

```solidity
function isRecoveryMode() external view returns (bool)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### predictNICR

```solidity
function predictNICR(address _troveOwner, enum LiquityView.LiquityActionId _action, address _from, uint256 _collAmount, uint256 _lusdAmount) external view returns (uint256 NICR)
```

Predict the resulting nominal collateral ratio after a trove modifying action



#### Parameters

| Name | Type | Description |
|---|---|---|
| _troveOwner | address | Address of the trove owner, if the action specified is LiquityOpen this argument is ignored
| _action | enum LiquityView.LiquityActionId | LiquityActionIds
| _from | address | undefined
| _collAmount | uint256 | undefined
| _lusdAmount | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| NICR | uint256 | undefined




