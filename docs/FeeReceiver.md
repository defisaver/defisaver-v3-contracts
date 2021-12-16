# FeeReceiver



> Contract that receivers fees and can be withdrawn from with the admin





## Methods

### approveAddress

```solidity
function approveAddress(address _tokenAddr, address _to, uint256 _amount) external nonpayable
```

Gives ERC20 token approval from this contract to an address

*This is needed if we change the BotRefill contract which needs to pull funds*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _tokenAddr | address | ERC20 token address
| _to | address | Address of the address to approve
| _amount | uint256 | Amount to approve

### withdrawEth

```solidity
function withdrawEth(address payable _to, uint256 _amount) external nonpayable
```

Withdraws Ether from the contract



#### Parameters

| Name | Type | Description |
|---|---|---|
| _to | address payable | Address where Eth will be sent
| _amount | uint256 | Amount of Eth to be sent, if 0 it takes the whole balance

### withdrawToken

```solidity
function withdrawToken(address _tokenAddr, address _to, uint256 _amount) external nonpayable
```

Withdraws ERC20 tokens from the contract



#### Parameters

| Name | Type | Description |
|---|---|---|
| _tokenAddr | address | ERC20 token address
| _to | address | Address where the tokens will be sent
| _amount | uint256 | Amount of tokens to be sent, if 0 it takes the whole balance




