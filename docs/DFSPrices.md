# DFSPrices









## Methods

### getBestPrice

```solidity
function getBestPrice(uint256 _amount, address _srcToken, address _destToken, enum DFSPrices.ActionType _type, address[] _wrappers, bytes[] _additionalData) external nonpayable returns (address, uint256)
```

Returns the best estimated price from 2 exchanges



#### Parameters

| Name | Type | Description |
|---|---|---|
| _amount | uint256 | Amount of source tokens you want to exchange
| _srcToken | address | Address of the source token
| _destToken | address | Address of the destination token
| _type | enum DFSPrices.ActionType | Type of action SELL|BUY
| _wrappers | address[] | Array of wrapper addresses to compare
| _additionalData | bytes[] | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | (address, uint) The address of the best exchange and the exchange price
| _1 | uint256 | undefined

### getExpectedRate

```solidity
function getExpectedRate(address _wrapper, address _srcToken, address _destToken, uint256 _amount, enum DFSPrices.ActionType _type, bytes _additionalData) external nonpayable returns (uint256)
```

Return the expected rate from the exchange wrapper

*In case of Oasis/Uniswap handles the different precision tokens*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _wrapper | address | Address of exchange wrapper
| _srcToken | address | From token
| _destToken | address | To token
| _amount | uint256 | Amount to be exchanged
| _type | enum DFSPrices.ActionType | Type of action SELL|BUY
| _additionalData | bytes | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined




