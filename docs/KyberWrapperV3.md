# KyberWrapperV3









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
function buy(address _srcAddr, address _destAddr, uint256 _destAmount, bytes) external nonpayable returns (uint256)
```

Buys a _destAmount of tokens at Kyber



#### Parameters

| Name | Type | Description |
|---|---|---|
| _srcAddr | address | From token
| _destAddr | address | To token
| _destAmount | uint256 | To amount
| _3 | bytes | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | uint srcAmount

### getBuyRate

```solidity
function getBuyRate(address _srcAddr, address _destAddr, uint256 _destAmount, bytes _additionalData) external view returns (uint256 rate)
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
| rate | uint256 | Rate

### getSellRate

```solidity
function getSellRate(address _srcAddr, address _destAddr, uint256 _srcAmount, bytes) external view returns (uint256 rate)
```

Return a rate for which we can sell an amount of tokens

*Will fail if token is over 18 decimals*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _srcAddr | address | From token
| _destAddr | address | To token
| _srcAmount | uint256 | From amount
| _3 | bytes | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| rate | uint256 | Rate

### kill

```solidity
function kill() external nonpayable
```

Destroy the contract




### sell

```solidity
function sell(address _srcAddr, address _destAddr, uint256 _srcAmount, bytes) external nonpayable returns (uint256)
```

Sells a _srcAmount of tokens at Kyber



#### Parameters

| Name | Type | Description |
|---|---|---|
| _srcAddr | address | From token
| _destAddr | address | To token
| _srcAmount | uint256 | From amount
| _3 | bytes | undefined

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




