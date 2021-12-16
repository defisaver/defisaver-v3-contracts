# UniV3WrapperV3



> DFS exchange wrapper for UniswapV3





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

Buys _destAmount of tokens at UniswapV3



#### Parameters

| Name | Type | Description |
|---|---|---|
| _srcAddr | address | From token
| _1 | address | undefined
| _destAmount | uint256 | To amount
| _additionalData | bytes | Path for swapping

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | uint amount of _srcAddr tokens sent for transaction

### getBuyRate

```solidity
function getBuyRate(address, address, uint256 _destAmount, bytes _additionalData) external nonpayable returns (uint256)
```

Return a rate for which we can buy an amount of tokens



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined
| _1 | address | undefined
| _destAmount | uint256 | To amount
| _additionalData | bytes | path object (encoded path_fee_path_fee_path etc.)

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | uint Rate (price)

### getSellRate

```solidity
function getSellRate(address, address, uint256 _srcAmount, bytes _additionalData) external nonpayable returns (uint256)
```

Return a rate for which we can sell an amount of tokens



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined
| _1 | address | undefined
| _srcAmount | uint256 | From amount
| _additionalData | bytes | path object (encoded path_fee_path_fee_path etc.)

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | uint Rate (price)

### kill

```solidity
function kill() external nonpayable
```

Destroy the contract




### quoter

```solidity
function quoter() external view returns (contract IQuoter)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IQuoter | undefined

### router

```solidity
function router() external view returns (contract ISwapRouter)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract ISwapRouter | undefined

### sell

```solidity
function sell(address _srcAddr, address, uint256 _srcAmount, bytes _additionalData) external nonpayable returns (uint256)
```

Sells _srcAmount of tokens at UniswapV3



#### Parameters

| Name | Type | Description |
|---|---|---|
| _srcAddr | address | From token
| _1 | address | undefined
| _srcAmount | uint256 | From amount
| _additionalData | bytes | Path for swapping

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | uint amount of tokens received from selling

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




