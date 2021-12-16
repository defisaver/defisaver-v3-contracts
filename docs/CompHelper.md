# CompHelper



> Utility functions and data used in Compound actions





## Methods

### ERR_COMP_ENTER_MARKET

```solidity
function ERR_COMP_ENTER_MARKET() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### ERR_COMP_EXIT_MARKET

```solidity
function ERR_COMP_EXIT_MARKET() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### enterMarket

```solidity
function enterMarket(address _cTokenAddr) external nonpayable
```

Enters the Compound market so it can be deposited/borrowed

*Markets can be entered multiple times, without the code reverting*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _cTokenAddr | address | CToken address of the token

### exitMarket

```solidity
function exitMarket(address _cTokenAddr) external nonpayable
```

Exits the Compound market



#### Parameters

| Name | Type | Description |
|---|---|---|
| _cTokenAddr | address | CToken address of the token




