# ISwapRouter



> Router token swapping functionality

Functions for swapping tokens via Uniswap V3



## Methods

### exactInput

```solidity
function exactInput(ISwapRouter.ExactInputParams params) external payable returns (uint256 amountOut)
```

Swaps `amountIn` of one token for as much as possible of another along the specified path



#### Parameters

| Name | Type | Description |
|---|---|---|
| params | ISwapRouter.ExactInputParams | The parameters necessary for the multi-hop swap, encoded as `ExactInputParams` in calldata

#### Returns

| Name | Type | Description |
|---|---|---|
| amountOut | uint256 | The amount of the received token

### exactInputSingle

```solidity
function exactInputSingle(ISwapRouter.ExactInputSingleParams params) external payable returns (uint256 amountOut)
```

Swaps `amountIn` of one token for as much as possible of another token



#### Parameters

| Name | Type | Description |
|---|---|---|
| params | ISwapRouter.ExactInputSingleParams | The parameters necessary for the swap, encoded as `ExactInputSingleParams` in calldata

#### Returns

| Name | Type | Description |
|---|---|---|
| amountOut | uint256 | The amount of the received token

### exactOutput

```solidity
function exactOutput(ISwapRouter.ExactOutputParams params) external payable returns (uint256 amountIn)
```

Swaps as little as possible of one token for `amountOut` of another along the specified path (reversed)



#### Parameters

| Name | Type | Description |
|---|---|---|
| params | ISwapRouter.ExactOutputParams | The parameters necessary for the multi-hop swap, encoded as `ExactOutputParams` in calldata

#### Returns

| Name | Type | Description |
|---|---|---|
| amountIn | uint256 | The amount of the input token

### exactOutputSingle

```solidity
function exactOutputSingle(ISwapRouter.ExactOutputSingleParams params) external payable returns (uint256 amountIn)
```

Swaps as little as possible of one token for `amountOut` of another token



#### Parameters

| Name | Type | Description |
|---|---|---|
| params | ISwapRouter.ExactOutputSingleParams | The parameters necessary for the swap, encoded as `ExactOutputSingleParams` in calldata

#### Returns

| Name | Type | Description |
|---|---|---|
| amountIn | uint256 | The amount of the input token

### uniswapV3SwapCallback

```solidity
function uniswapV3SwapCallback(int256 amount0Delta, int256 amount1Delta, bytes data) external nonpayable
```

Called to `msg.sender` after executing a swap via IUniswapV3Pool#swap.

*In the implementation you must pay the pool tokens owed for the swap. The caller of this method must be checked to be a UniswapV3Pool deployed by the canonical UniswapV3Factory. amount0Delta and amount1Delta can both be 0 if no tokens were swapped.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| amount0Delta | int256 | The amount of token0 that was sent (negative) or must be received (positive) by the pool by the end of the swap. If positive, the callback must send that amount of token0 to the pool.
| amount1Delta | int256 | The amount of token1 that was sent (negative) or must be received (positive) by the pool by the end of the swap. If positive, the callback must send that amount of token1 to the pool.
| data | bytes | Any data passed through by the caller via the IUniswapV3PoolActions#swap call




