# IERC3156FlashLender









## Methods

### flashFee

```solidity
function flashFee(address token, uint256 amount) external view returns (uint256)
```



*The fee to be charged for a given loan.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | The loan currency.
| amount | uint256 | The amount of tokens lent.

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | The amount of `token` to be charged for the loan, on top of the returned principal.

### flashLoan

```solidity
function flashLoan(contract IERC3156FlashBorrower receiver, address token, uint256 amount, bytes data) external nonpayable returns (bool)
```



*Initiate a flash loan.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| receiver | contract IERC3156FlashBorrower | The receiver of the tokens in the loan, and the receiver of the callback.
| token | address | The loan currency.
| amount | uint256 | The amount of tokens lent.
| data | bytes | Arbitrary data structure, intended to contain user-defined parameters.

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### maxFlashLoan

```solidity
function maxFlashLoan(address token) external view returns (uint256)
```



*The amount of currency available to be lent.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| token | address | The loan currency.

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | The amount of `token` that can be borrowed.




