# IVault









## Methods

### exitPool

```solidity
function exitPool(bytes32 poolId, address sender, address payable recipient, IVault.ExitPoolRequest request) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| poolId | bytes32 | undefined
| sender | address | undefined
| recipient | address payable | undefined
| request | IVault.ExitPoolRequest | undefined

### getPoolTokens

```solidity
function getPoolTokens(bytes32 poolId) external view returns (address[] tokens, uint256[] balances, uint256 lastChangeBlock)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| poolId | bytes32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| tokens | address[] | undefined
| balances | uint256[] | undefined
| lastChangeBlock | uint256 | undefined

### joinPool

```solidity
function joinPool(bytes32 poolId, address sender, address recipient, IVault.JoinPoolRequest request) external payable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| poolId | bytes32 | undefined
| sender | address | undefined
| recipient | address | undefined
| request | IVault.JoinPoolRequest | undefined




