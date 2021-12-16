# IGUniRouter02









## Methods

### addLiquidity

```solidity
function addLiquidity(address pool, uint256 amount0Max, uint256 amount1Max, uint256 amount0Min, uint256 amount1Min, address receiver) external nonpayable returns (uint256 amount0, uint256 amount1, uint256 mintAmount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| pool | address | undefined
| amount0Max | uint256 | undefined
| amount1Max | uint256 | undefined
| amount0Min | uint256 | undefined
| amount1Min | uint256 | undefined
| receiver | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| amount0 | uint256 | undefined
| amount1 | uint256 | undefined
| mintAmount | uint256 | undefined

### rebalanceAndAddLiquidity

```solidity
function rebalanceAndAddLiquidity(address pool, uint256 amount0In, uint256 amount1In, uint256 amountSwap, bool zeroForOne, address[] swapActions, bytes[] swapDatas, uint256 amount0Min, uint256 amount1Min, address receiver) external nonpayable returns (uint256 amount0, uint256 amount1, uint256 mintAmount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| pool | address | undefined
| amount0In | uint256 | undefined
| amount1In | uint256 | undefined
| amountSwap | uint256 | undefined
| zeroForOne | bool | undefined
| swapActions | address[] | undefined
| swapDatas | bytes[] | undefined
| amount0Min | uint256 | undefined
| amount1Min | uint256 | undefined
| receiver | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| amount0 | uint256 | undefined
| amount1 | uint256 | undefined
| mintAmount | uint256 | undefined

### removeLiquidity

```solidity
function removeLiquidity(address pool, uint256 burnAmount, uint256 amount0Min, uint256 amount1Min, address receiver) external nonpayable returns (uint256 amount0, uint256 amount1, uint128 liquidityBurned)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| pool | address | undefined
| burnAmount | uint256 | undefined
| amount0Min | uint256 | undefined
| amount1Min | uint256 | undefined
| receiver | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| amount0 | uint256 | undefined
| amount1 | uint256 | undefined
| liquidityBurned | uint128 | undefined




