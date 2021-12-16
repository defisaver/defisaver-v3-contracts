# Discount









## Methods

### disableServiceFee

```solidity
function disableServiceFee(address _user) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | undefined

### getCustomServiceFee

```solidity
function getCustomServiceFee(address _user) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### isCustomFeeSet

```solidity
function isCustomFeeSet(address _user) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### owner

```solidity
function owner() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### serviceFees

```solidity
function serviceFees(address) external view returns (bool active, uint256 amount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| active | bool | undefined
| amount | uint256 | undefined

### setServiceFee

```solidity
function setServiceFee(address _user, uint256 _fee) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | undefined
| _fee | uint256 | undefined




