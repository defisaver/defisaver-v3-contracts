# IUniswapV3NonfungiblePositionManager









## Methods

### approve

```solidity
function approve(address to, uint256 tokenId) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| to | address | undefined
| tokenId | uint256 | undefined

### balanceOf

```solidity
function balanceOf(address owner) external view returns (uint256 balance)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| owner | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| balance | uint256 | undefined

### collect

```solidity
function collect(IUniswapV3NonfungiblePositionManager.CollectParams params) external payable returns (uint256 amount0, uint256 amount1)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| params | IUniswapV3NonfungiblePositionManager.CollectParams | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| amount0 | uint256 | undefined
| amount1 | uint256 | undefined

### createAndInitializePoolIfNecessary

```solidity
function createAndInitializePoolIfNecessary(address token0, address token1, uint24 fee, uint160 sqrtPriceX96) external payable returns (address pool)
```

Creates a new pool if it does not exist, then initializes if not initialized

*This method can be bundled with others via IMulticall for the first action (e.g. mint) performed against a pool*

#### Parameters

| Name | Type | Description |
|---|---|---|
| token0 | address | The contract address of token0 of the pool
| token1 | address | The contract address of token1 of the pool
| fee | uint24 | The fee amount of the v3 pool for the specified token pair
| sqrtPriceX96 | uint160 | The initial square root price of the pool as a Q64.96 value

#### Returns

| Name | Type | Description |
|---|---|---|
| pool | address | Returns the pool address based on the pair of tokens and fee, will return the newly created pool address if necessary

### decreaseLiquidity

```solidity
function decreaseLiquidity(IUniswapV3NonfungiblePositionManager.DecreaseLiquidityParams params) external payable returns (uint256 amount0, uint256 amount1)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| params | IUniswapV3NonfungiblePositionManager.DecreaseLiquidityParams | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| amount0 | uint256 | undefined
| amount1 | uint256 | undefined

### increaseLiquidity

```solidity
function increaseLiquidity(IUniswapV3NonfungiblePositionManager.IncreaseLiquidityParams params) external payable returns (uint128 liquidity, uint256 amount0, uint256 amount1)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| params | IUniswapV3NonfungiblePositionManager.IncreaseLiquidityParams | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| liquidity | uint128 | undefined
| amount0 | uint256 | undefined
| amount1 | uint256 | undefined

### mint

```solidity
function mint(IUniswapV3NonfungiblePositionManager.MintParams params) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| params | IUniswapV3NonfungiblePositionManager.MintParams | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| tokenId | uint256 | undefined
| liquidity | uint128 | undefined
| amount0 | uint256 | undefined
| amount1 | uint256 | undefined

### positions

```solidity
function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenId | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| nonce | uint96 | undefined
| operator | address | undefined
| token0 | address | undefined
| token1 | address | undefined
| fee | uint24 | undefined
| tickLower | int24 | undefined
| tickUpper | int24 | undefined
| liquidity | uint128 | undefined
| feeGrowthInside0LastX128 | uint256 | undefined
| feeGrowthInside1LastX128 | uint256 | undefined
| tokensOwed0 | uint128 | undefined
| tokensOwed1 | uint128 | undefined

### tokenOfOwnerByIndex

```solidity
function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256 tokenId)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| owner | address | undefined
| index | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| tokenId | uint256 | undefined




