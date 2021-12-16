# ISAFEEngine









## Methods

### approveSAFEModification

```solidity
function approveSAFEModification(address) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### coinBalance

```solidity
function coinBalance(address) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### collateralTypes

```solidity
function collateralTypes(bytes32) external view returns (uint256 debtAmount, uint256 accumulatedRate, uint256 safetyPrice, uint256 debtCeiling, uint256 debtFloor, uint256 liquidationPrice)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| debtAmount | uint256 | undefined
| accumulatedRate | uint256 | undefined
| safetyPrice | uint256 | undefined
| debtCeiling | uint256 | undefined
| debtFloor | uint256 | undefined
| liquidationPrice | uint256 | undefined

### modifySAFECollateralization

```solidity
function modifySAFECollateralization(bytes32, address, address, address, int256, int256) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined
| _1 | address | undefined
| _2 | address | undefined
| _3 | address | undefined
| _4 | int256 | undefined
| _5 | int256 | undefined

### safeRights

```solidity
function safeRights(address, address) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined
| _1 | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### safes

```solidity
function safes(bytes32, address) external view returns (uint256 lockedCollateral, uint256 generatedDebt)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined
| _1 | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| lockedCollateral | uint256 | undefined
| generatedDebt | uint256 | undefined

### tokenCollateral

```solidity
function tokenCollateral(bytes32, address) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined
| _1 | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### transferInternalCoins

```solidity
function transferInternalCoins(address, address, uint256) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined
| _1 | address | undefined
| _2 | uint256 | undefined

### transferSAFECollateralAndDebt

```solidity
function transferSAFECollateralAndDebt(bytes32, address, address, int256, int256) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined
| _1 | address | undefined
| _2 | address | undefined
| _3 | int256 | undefined
| _4 | int256 | undefined




