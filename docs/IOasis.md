# IOasis









## Methods

### buyAllAmount

```solidity
function buyAllAmount(address buy_gem, uint256 buy_amt, address pay_gem, uint256 max_fill_amount) external nonpayable returns (uint256 fill_amt)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| buy_gem | address | undefined
| buy_amt | uint256 | undefined
| pay_gem | address | undefined
| max_fill_amount | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| fill_amt | uint256 | undefined

### getBuyAmount

```solidity
function getBuyAmount(address tokenToBuy, address tokenToPay, uint256 amountToPay) external view returns (uint256 amountBought)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenToBuy | address | undefined
| tokenToPay | address | undefined
| amountToPay | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| amountBought | uint256 | undefined

### getPayAmount

```solidity
function getPayAmount(address tokenToPay, address tokenToBuy, uint256 amountToBuy) external view returns (uint256 amountPaid)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| tokenToPay | address | undefined
| tokenToBuy | address | undefined
| amountToBuy | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| amountPaid | uint256 | undefined

### sellAllAmount

```solidity
function sellAllAmount(address pay_gem, uint256 pay_amt, address buy_gem, uint256 min_fill_amount) external nonpayable returns (uint256 fill_amt)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| pay_gem | address | undefined
| pay_amt | uint256 | undefined
| buy_gem | address | undefined
| min_fill_amount | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| fill_amt | uint256 | undefined




