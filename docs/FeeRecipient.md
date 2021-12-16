# FeeRecipient



> Stores the fee recipient address and allows the owner to change it





## Methods

### adminVault

```solidity
function adminVault() external view returns (contract AdminVault)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract AdminVault | undefined

### changeWalletAddr

```solidity
function changeWalletAddr(address _newWallet) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _newWallet | address | undefined

### getFeeAddr

```solidity
function getFeeAddr() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### kill

```solidity
function kill() external nonpayable
```

Destroy the contract




### wallet

```solidity
function wallet() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

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




