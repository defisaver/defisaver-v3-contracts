# ProxyPermission



> ProxyPermission Proxy contract which works with DSProxy to give execute permission





## Methods

### givePermission

```solidity
function givePermission(address _contractAddr) external nonpayable
```

Called in the context of DSProxy to authorize an address



#### Parameters

| Name | Type | Description |
|---|---|---|
| _contractAddr | address | Address which will be authorized

### removePermission

```solidity
function removePermission(address _contractAddr) external nonpayable
```

Called in the context of DSProxy to remove authority of an address



#### Parameters

| Name | Type | Description |
|---|---|---|
| _contractAddr | address | Auth address which will be removed from authority list




