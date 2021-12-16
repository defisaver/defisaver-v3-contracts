# ISwaps









## Methods

### exchange

```solidity
function exchange(address _pool, address _from, address _to, uint256 _amount, uint256 _expected, address _receiver) external payable returns (uint256)
```

Perform an exchange using a specific pool

*Prior to calling this function, the caller must approve        this contract to transfer `_amount` coins from `_from`        Works for both regular and factory-deployed pools*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _pool | address | Address of the pool to use for the swap
| _from | address | Address of coin being sent
| _to | address | Address of coin being received
| _amount | uint256 | Quantity of `_from` being sent
| _expected | uint256 | Minimum quantity of `_from` received        in order for the transaction to succeed
| _receiver | address | Address to transfer the received tokens to

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | uint256 Amount received

### exchange_with_best_rate

```solidity
function exchange_with_best_rate(address _from, address _to, uint256 _amount, uint256 _expected, address _receiver) external payable returns (uint256)
```

Perform an exchange using the pool that offers the best rate

*Prior to calling this function, the caller must approve        this contract to transfer `_amount` coins from `_from`        Does NOT check rates in factory-deployed pools*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _from | address | Address of coin being sent
| _to | address | Address of coin being received
| _amount | uint256 | Quantity of `_from` being sent
| _expected | uint256 | Minimum quantity of `_from` received        in order for the transaction to succeed
| _receiver | address | Address to transfer the received tokens to

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | uint256 Amount received

### get_best_rate

```solidity
function get_best_rate(address _from, address _to, uint256 _amount, address[8] _exclude_pools) external view returns (address, uint256)
```

Find the pool offering the best rate for a given swap.

*Checks rates for regular and factory pools*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _from | address | Address of coin being sent
| _to | address | Address of coin being received
| _amount | uint256 | Quantity of `_from` being sent
| _exclude_pools | address[8] | A list of up to 8 addresses which shouldn&#39;t be returned

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | Pool address, amount received
| _1 | uint256 | undefined

### get_calculator

```solidity
function get_calculator(address _pool) external view returns (address)
```

Set calculator contract

*Used to calculate `get_dy` for a pool*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _pool | address | Pool address

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | `CurveCalc` address

### get_exchange_amount

```solidity
function get_exchange_amount(address _pool, address _from, address _to, uint256 _amount) external view returns (uint256)
```

Get the current number of coins received in an exchange

*Works for both regular and factory-deployed pools*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _pool | address | Pool address
| _from | address | Address of coin to be sent
| _to | address | Address of coin to be received
| _amount | uint256 | Quantity of `_from` to be sent

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | Quantity of `_to` to be received

### get_exchange_amounts

```solidity
function get_exchange_amounts(address _pool, address _from, address _to, uint256[] _amounts) external view returns (uint256[])
```

Get the current number of coins required to receive the given amount in an exchange



#### Parameters

| Name | Type | Description |
|---|---|---|
| _pool | address | Pool address
| _from | address | Address of coin to be sent
| _to | address | Address of coin to be received
| _amounts | uint256[] | Quantity of `_to` to be received

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256[] | Quantity of `_from` to be sent

### get_input_amount

```solidity
function get_input_amount(address _pool, address _from, address _to, uint256 _amount) external view returns (uint256)
```

Get the current number of coins required to receive the given amount in an exchange



#### Parameters

| Name | Type | Description |
|---|---|---|
| _pool | address | Pool address
| _from | address | Address of coin to be sent
| _to | address | Address of coin to be received
| _amount | uint256 | Quantity of `_to` to be received

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | Quantity of `_from` to be sent




