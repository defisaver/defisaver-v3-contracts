# DyDxHelper









## Methods

### getAccount

```solidity
function getAccount(address _user, uint256 _index) external pure returns (struct Account.Info)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | undefined
| _index | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | Account.Info | undefined

### getMarketIdFromTokenAddress

```solidity
function getMarketIdFromTokenAddress(address _token) external view returns (uint256 marketId)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _token | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| marketId | uint256 | undefined

### getWeiBalance

```solidity
function getWeiBalance(address _user, uint256 _index, uint256 _marketId) external view returns (struct Types.Wei)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | undefined
| _index | uint256 | undefined
| _marketId | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | Types.Wei | undefined

### soloMargin

```solidity
function soloMargin() external view returns (contract ISoloMargin)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract ISoloMargin | undefined




