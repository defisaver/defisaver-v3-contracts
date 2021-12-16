# ImAsset









## Methods

### bAssetIndexes

```solidity
function bAssetIndexes(address) external view returns (uint8)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint8 | undefined

### getBasket

```solidity
function getBasket() external view returns (bool, bool)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined
| _1 | bool | undefined

### getBasset

```solidity
function getBasset(address _token) external view returns (struct BassetPersonal personal, struct BassetData data)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _token | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| personal | BassetPersonal | undefined
| data | BassetData | undefined

### getBassets

```solidity
function getBassets() external view returns (struct BassetPersonal[] personal, struct BassetData[] data)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| personal | BassetPersonal[] | undefined
| data | BassetData[] | undefined

### getMintMultiOutput

```solidity
function getMintMultiOutput(address[] _inputs, uint256[] _inputQuantities) external view returns (uint256 mintOutput)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _inputs | address[] | undefined
| _inputQuantities | uint256[] | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| mintOutput | uint256 | undefined

### getMintOutput

```solidity
function getMintOutput(address _input, uint256 _inputQuantity) external view returns (uint256 mintOutput)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _input | address | undefined
| _inputQuantity | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| mintOutput | uint256 | undefined

### getRedeemExactBassetsOutput

```solidity
function getRedeemExactBassetsOutput(address[] _outputs, uint256[] _outputQuantities) external view returns (uint256 mAssetAmount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _outputs | address[] | undefined
| _outputQuantities | uint256[] | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| mAssetAmount | uint256 | undefined

### getRedeemOutput

```solidity
function getRedeemOutput(address _output, uint256 _mAssetQuantity) external view returns (uint256 bAssetOutput)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _output | address | undefined
| _mAssetQuantity | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| bAssetOutput | uint256 | undefined

### getSwapOutput

```solidity
function getSwapOutput(address _input, address _output, uint256 _inputQuantity) external view returns (uint256 swapOutput)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _input | address | undefined
| _output | address | undefined
| _inputQuantity | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| swapOutput | uint256 | undefined

### mint

```solidity
function mint(address _input, uint256 _inputQuantity, uint256 _minOutputQuantity, address _recipient) external nonpayable returns (uint256 mintOutput)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _input | address | undefined
| _inputQuantity | uint256 | undefined
| _minOutputQuantity | uint256 | undefined
| _recipient | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| mintOutput | uint256 | undefined

### mintMulti

```solidity
function mintMulti(address[] _inputs, uint256[] _inputQuantities, uint256 _minOutputQuantity, address _recipient) external nonpayable returns (uint256 mintOutput)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _inputs | address[] | undefined
| _inputQuantities | uint256[] | undefined
| _minOutputQuantity | uint256 | undefined
| _recipient | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| mintOutput | uint256 | undefined

### redeem

```solidity
function redeem(address _output, uint256 _mAssetQuantity, uint256 _minOutputQuantity, address _recipient) external nonpayable returns (uint256 outputQuantity)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _output | address | undefined
| _mAssetQuantity | uint256 | undefined
| _minOutputQuantity | uint256 | undefined
| _recipient | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| outputQuantity | uint256 | undefined

### redeemExactBassets

```solidity
function redeemExactBassets(address[] _outputs, uint256[] _outputQuantities, uint256 _maxMassetQuantity, address _recipient) external nonpayable returns (uint256 mAssetRedeemed)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _outputs | address[] | undefined
| _outputQuantities | uint256[] | undefined
| _maxMassetQuantity | uint256 | undefined
| _recipient | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| mAssetRedeemed | uint256 | undefined

### redeemMasset

```solidity
function redeemMasset(uint256 _mAssetQuantity, uint256[] _minOutputQuantities, address _recipient) external nonpayable returns (uint256[] outputQuantities)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _mAssetQuantity | uint256 | undefined
| _minOutputQuantities | uint256[] | undefined
| _recipient | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| outputQuantities | uint256[] | undefined

### swap

```solidity
function swap(address _input, address _output, uint256 _inputQuantity, uint256 _minOutputQuantity, address _recipient) external nonpayable returns (uint256 swapOutput)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _input | address | undefined
| _output | address | undefined
| _inputQuantity | uint256 | undefined
| _minOutputQuantity | uint256 | undefined
| _recipient | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| swapOutput | uint256 | undefined




