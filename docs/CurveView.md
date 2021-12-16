# CurveView









## Methods

### AddressProvider

```solidity
function AddressProvider() external view returns (contract IAddressProvider)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IAddressProvider | undefined

### FeeDistributor

```solidity
function FeeDistributor() external view returns (contract IFeeDistributor)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IFeeDistributor | undefined

### Minter

```solidity
function Minter() external view returns (contract IMinter)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IMinter | undefined

### VotingEscrow

```solidity
function VotingEscrow() external view returns (contract IVotingEscrow)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IVotingEscrow | undefined

### curveDepositSig

```solidity
function curveDepositSig(uint256 _nCoins, bool _useUnderlying) external pure returns (bytes4)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _nCoins | uint256 | undefined
| _useUnderlying | bool | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes4 | undefined

### curveWithdrawImbalanceSig

```solidity
function curveWithdrawImbalanceSig(uint256 _nCoins, bool _useUnderlying) external pure returns (bytes4)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _nCoins | uint256 | undefined
| _useUnderlying | bool | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes4 | undefined

### curveWithdrawSig

```solidity
function curveWithdrawSig(uint256 _nCoins, bool _useUnderlying) external pure returns (bytes4)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _nCoins | uint256 | undefined
| _useUnderlying | bool | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes4 | undefined

### gaugeBalance

```solidity
function gaugeBalance(address _gaugeAddr, address _user) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _gaugeAddr | address | undefined
| _user | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getPoolDataFromLpToken

```solidity
function getPoolDataFromLpToken(address _lpToken) external view returns (uint256 virtualPrice, address pool, string poolName, address[8] tokens, uint256[8] decimals, uint256[8] balances, address[8] underlyingTokens, uint256[8] underlyingDecimals, uint256[8] underlyingBalances, address[10] gauges, int128[10] gaugeTypes)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _lpToken | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| virtualPrice | uint256 | undefined
| pool | address | undefined
| poolName | string | undefined
| tokens | address[8] | undefined
| decimals | uint256[8] | undefined
| balances | uint256[8] | undefined
| underlyingTokens | address[8] | undefined
| underlyingDecimals | uint256[8] | undefined
| underlyingBalances | uint256[8] | undefined
| gauges | address[10] | undefined
| gaugeTypes | int128[10] | undefined

### getUserLP

```solidity
function getUserLP(address _user, uint256 _startIndex, uint256 _returnSize, uint256 _loopLimit) external view returns (struct CurveView.LpBalance[] lpBalances, uint256 nextIndex)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | undefined
| _startIndex | uint256 | undefined
| _returnSize | uint256 | undefined
| _loopLimit | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| lpBalances | CurveView.LpBalance[] | undefined
| nextIndex | uint256 | undefined




