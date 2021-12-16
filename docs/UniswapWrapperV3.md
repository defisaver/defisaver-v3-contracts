# UniswapWrapperV3



> DFS exchange wrapper for UniswapV2





## Methods

### adminVault

```solidity
function adminVault() external view returns (contract AdminVault)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract AdminVault | undefined

### buy

```solidity
function buy(address _srcAddr, address, uint256 _destAmount, bytes _additionalData) external nonpayable returns (uint256)
```

Buys a _destAmount of tokens at UniswapV2



#### Parameters

| Name | Type | Description |
|---|---|---|
| _srcAddr | address | From token
| _1 | address | undefined
| _destAmount | uint256 | To amount
| _additionalData | bytes | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | uint srcAmount

### getBuyRate

```solidity
function getBuyRate(address _srcAddr, address _destAddr, uint256 _destAmount, bytes _additionalData) external view returns (uint256)
```

Return a rate for which we can buy an amount of tokens



#### Parameters

| Name | Type | Description |
|---|---|---|
| _srcAddr | address | From token
| _destAddr | address | To token
| _destAmount | uint256 | To amount
| _additionalData | bytes | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | uint Rate

### getSellRate

```solidity
function getSellRate(address _srcAddr, address _destAddr, uint256 _srcAmount, bytes _additionalData) external view returns (uint256)
```

Return a rate for which we can sell an amount of tokens



#### Parameters

| Name | Type | Description |
|---|---|---|
| _srcAddr | address | From token
| _destAddr | address | To token
| _srcAmount | uint256 | From amount
| _additionalData | bytes | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | uint Rate

### kill

```solidity
function kill() external nonpayable
```

Destroy the contract




### router

```solidity
function router() external view returns (contract IUniswapRouter)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IUniswapRouter | undefined

### sell

```solidity
function sell(address _srcAddr, address, uint256 _srcAmount, bytes _additionalData) external nonpayable returns (uint256)
```

Sells a _srcAmount of tokens at UniswapV2



#### Parameters

| Name | Type | Description |
|---|---|---|
| _srcAddr | address | From token
| _1 | address | undefined
| _srcAmount | uint256 | From amount
| _additionalData | bytes | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | uint Destination amount

### withdrawStuckFunds

```solidity
function withdrawStuckFunds(address _token, address _receiver, uint256 _amount) external nonpayable
```

withdraw stuck funds



#### Parameters

| Name | Type | Description |
|---|---|---|
| _token | address | undefined
| _receiver | address | undefined
| _amount | uint256 | undefined




