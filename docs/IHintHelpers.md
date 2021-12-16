# IHintHelpers









## Methods

### computeCR

```solidity
function computeCR(uint256 _coll, uint256 _debt, uint256 _price) external pure returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _coll | uint256 | undefined
| _debt | uint256 | undefined
| _price | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### computeNominalCR

```solidity
function computeNominalCR(uint256 _coll, uint256 _debt) external pure returns (uint256)
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




