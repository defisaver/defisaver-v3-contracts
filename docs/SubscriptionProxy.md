# SubscriptionProxy



> Handles auth and calls subscription contract





## Methods

### adminVault

```solidity
function adminVault() external view returns (contract AdminVault)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract AdminVault | undefined

### createStrategy

```solidity
function createStrategy(uint256 _templateId, bool _active, bytes[][] _actionData, bytes[][] _triggerData) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _templateId | uint256 | undefined
| _active | bool | undefined
| _actionData | bytes[][] | undefined
| _triggerData | bytes[][] | undefined

### createTemplate

```solidity
function createTemplate(string _name, bytes32[] _triggerIds, bytes32[] _actionIds, uint8[][] _paramMapping) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _name | string | undefined
| _triggerIds | bytes32[] | undefined
| _actionIds | bytes32[] | undefined
| _paramMapping | uint8[][] | undefined

### createTemplateAndStrategy

```solidity
function createTemplateAndStrategy(string _name, bytes32[] _triggerIds, bytes32[] _actionIds, uint8[][] _paramMapping, bool _active, bytes[][] _actionData, bytes[][] _triggerData) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _name | string | undefined
| _triggerIds | bytes32[] | undefined
| _actionIds | bytes32[] | undefined
| _paramMapping | uint8[][] | undefined
| _active | bool | undefined
| _actionData | bytes[][] | undefined
| _triggerData | bytes[][] | undefined

### givePermission

```solidity
function givePermission(address _contractAddr) external nonpayable
```

Called in the context of DSProxy to authorize an address



#### Parameters

| Name | Type | Description |
|---|---|---|
| _contractAddr | address | Address which will be authorized

### kill

```solidity
function kill() external nonpayable
```

Destroy the contract




### registry

```solidity
function registry() external view returns (contract DFSRegistry)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract DFSRegistry | undefined

### removePermission

```solidity
function removePermission(address _contractAddr) external nonpayable
```

Called in the context of DSProxy to remove authority of an address



#### Parameters

| Name | Type | Description |
|---|---|---|
| _contractAddr | address | Auth address which will be removed from authority list

### unsubscribeStrategy

```solidity
function unsubscribeStrategy(uint256 _strategyId) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _strategyId | uint256 | undefined

### updateStrategy

```solidity
function updateStrategy(uint256 _strategyId, uint256 _templateId, bool _active, bytes[][] _actionData, bytes[][] _triggerData) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _strategyId | uint256 | undefined
| _templateId | uint256 | undefined
| _active | bool | undefined
| _actionData | bytes[][] | undefined
| _triggerData | bytes[][] | undefined

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




