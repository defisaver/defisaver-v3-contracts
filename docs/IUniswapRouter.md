# IUniswapRouter









## Methods

### addLiquidity

```solidity
function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) external nonpayable returns (uint256 amountA, uint256 amountB, uint256 liquidity)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenA | address | undefined
| tokenB | address | undefined
| amountADesired | uint256 | undefined
| amountBDesired | uint256 | undefined
| amountAMin | uint256 | undefined
| amountBMin | uint256 | undefined
| to | address | undefined
| deadline | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| amountA | uint256 | undefined
| amountB | uint256 | undefined
| liquidity | uint256 | undefined

### addLiquidityETH

```solidity
function addLiquidityETH(address token, uint256 amountTokenDesired, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | undefined
| amountTokenDesired | uint256 | undefined
| amountTokenMin | uint256 | undefined
| amountETHMin | uint256 | undefined
| to | address | undefined
| deadline | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| amountToken | uint256 | undefined
| amountETH | uint256 | undefined
| liquidity | uint256 | undefined

### getAmountsIn

```solidity
function getAmountsIn(uint256 amountOut, address[] path) external view returns (uint256[] amounts)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| amountOut | uint256 | undefined
| path | address[] | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| amounts | uint256[] | undefined

### getAmountsOut

```solidity
function getAmountsOut(uint256 amountIn, address[] path) external view returns (uint256[] amounts)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| amountIn | uint256 | undefined
| path | address[] | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| amounts | uint256[] | undefined

### quote

```solidity
function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) external pure returns (uint256 amountB)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| amountA | uint256 | undefined
| reserveA | uint256 | undefined
| reserveB | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| amountB | uint256 | undefined

### removeLiquidity

```solidity
function removeLiquidity(address tokenA, address tokenB, uint256 liquidity, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) external nonpayable returns (uint256 amountA, uint256 amountB)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenA | address | undefined
| tokenB | address | undefined
| liquidity | uint256 | undefined
| amountAMin | uint256 | undefined
| amountBMin | uint256 | undefined
| to | address | undefined
| deadline | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| amountA | uint256 | undefined
| amountB | uint256 | undefined

### swapExactTokensForETH

```solidity
function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) external nonpayable returns (uint256[] amounts)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| amountIn | uint256 | undefined
| amountOutMin | uint256 | undefined
| path | address[] | undefined
| to | address | undefined
| deadline | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| amounts | uint256[] | undefined

### swapExactTokensForTokens

```solidity
function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline) external nonpayable returns (uint256[] amounts)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| amountIn | uint256 | undefined
| amountOutMin | uint256 | undefined
| path | address[] | undefined
| to | address | undefined
| deadline | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| amounts | uint256[] | undefined

### swapTokensForExactETH

```solidity
function swapTokensForExactETH(uint256 amountOut, uint256 amountInMax, address[] path, address to, uint256 deadline) external nonpayable returns (uint256[] amounts)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| amountOut | uint256 | undefined
| amountInMax | uint256 | undefined
| path | address[] | undefined
| to | address | undefined
| deadline | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| amounts | uint256[] | undefined

### swapTokensForExactTokens

```solidity
function swapTokensForExactTokens(uint256 amountOut, uint256 amountInMax, address[] path, address to, uint256 deadline) external nonpayable returns (uint256[] amounts)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| amountOut | uint256 | undefined
| amountInMax | uint256 | undefined
| path | address[] | undefined
| to | address | undefined
| deadline | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| amounts | uint256[] | undefined




