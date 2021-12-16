# ILiquidityGauge









## Methods

### approved_to_deposit

```solidity
function approved_to_deposit(address _depositor, address _recipient) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _depositor | address | undefined
| _recipient | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### balanceOf

```solidity
function balanceOf(address) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### deposit

```solidity
function deposit(uint256 _amount, address _receiver) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _amount | uint256 | undefined
| _receiver | address | undefined

### lp_token

```solidity
function lp_token() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### set_approve_deposit

```solidity
function set_approve_deposit(address _depositor, bool _canDeposit) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _depositor | address | undefined
| _canDeposit | bool | undefined

### withdraw

```solidity
function withdraw(uint256 _amount) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _amount | uint256 | undefined




