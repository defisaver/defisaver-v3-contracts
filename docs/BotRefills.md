# BotRefills



> Contract used to refill tx sending bots when they are low on eth





## Methods

### additionalBots

```solidity
function additionalBots(address) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### adminVault

```solidity
function adminVault() external view returns (contract AdminVault)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract AdminVault | undefined

### kill

```solidity
function kill() external nonpayable
```

Destroy the contract




### refill

```solidity
function refill(uint256 _ethAmount, address _botAddress) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _ethAmount | uint256 | undefined
| _botAddress | address | undefined

### refillMany

```solidity
function refillMany(uint256[] _ethAmounts, address[] _botAddresses) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _ethAmounts | uint256[] | undefined
| _botAddresses | address[] | undefined

### setAdditionalBot

```solidity
function setAdditionalBot(address _botAddr, bool _approved) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _botAddr | address | undefined
| _approved | bool | undefined

### setFeeAddr

```solidity
function setFeeAddr(address _newFeeAddr) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _newFeeAddr | address | undefined

### setRefillCaller

```solidity
function setRefillCaller(address _newBot) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _newBot | address | undefined

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




