# Subscriptions



> Storage of strategies and templates





## Methods

### ERR_EMPTY_STRATEGY

```solidity
function ERR_EMPTY_STRATEGY() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### ERR_SENDER_NOT_OWNER

```solidity
function ERR_SENDER_NOT_OWNER() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

### ERR_USER_POS_EMPTY

```solidity
function ERR_USER_POS_EMPTY() external view returns (string)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined

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
function createStrategy(uint256 _templateId, bool _active, bytes[][] _subData, bytes[][] _triggerData) external nonpayable returns (uint256)
```

Creates a new strategy with an existing template



#### Parameters

| Name | Type | Description |
|---|---|---|
| _templateId | uint256 | Id of the template used for strategy
| _active | bool | If the strategy is turned on at the start
| _subData | bytes[][] | Subscription data for actions
| _triggerData | bytes[][] | Subscription data for triggers

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### createTemplate

```solidity
function createTemplate(string _name, bytes32[] _triggerIds, bytes32[] _actionIds, uint8[][] _paramMapping) external nonpayable returns (uint256)
```

Creates a new template to use in strategies

*Templates once created can&#39;t be changed*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _name | string | Name of template, used mainly for logging
| _triggerIds | bytes32[] | Array of trigger ids which translate to trigger addresses
| _actionIds | bytes32[] | Array of actions ids which translate to action addresses
| _paramMapping | uint8[][] | Array that holds metadata of how inputs are mapped to sub/return data

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getPaginatedStrategies

```solidity
function getPaginatedStrategies(uint256 _page, uint256 _perPage) external view returns (struct StrategyData.Strategy[])
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _page | uint256 | undefined
| _perPage | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | StrategyData.Strategy[] | undefined

### getPaginatedTemplates

```solidity
function getPaginatedTemplates(uint256 _page, uint256 _perPage) external view returns (struct StrategyData.Template[])
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _page | uint256 | undefined
| _perPage | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | StrategyData.Template[] | undefined

### getStrategies

```solidity
function getStrategies() external view returns (struct StrategyData.Strategy[])
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | StrategyData.Strategy[] | undefined

### getStrategy

```solidity
function getStrategy(uint256 _strategyId) external view returns (struct StrategyData.Strategy)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _strategyId | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | StrategyData.Strategy | undefined

### getStrategyCount

```solidity
function getStrategyCount() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getTemplate

```solidity
function getTemplate(uint256 _templateId) external view returns (struct StrategyData.Template)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _templateId | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | StrategyData.Template | undefined

### getTemplateCount

```solidity
function getTemplateCount() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getTemplateFromStrategy

```solidity
function getTemplateFromStrategy(uint256 _strategyId) external view returns (struct StrategyData.Template)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _strategyId | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | StrategyData.Template | undefined

### getTemplates

```solidity
function getTemplates() external view returns (struct StrategyData.Template[])
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | StrategyData.Template[] | undefined

### getUserStrategies

```solidity
function getUserStrategies(address _user) external view returns (struct StrategyData.Strategy[])
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | StrategyData.Strategy[] | undefined

### kill

```solidity
function kill() external nonpayable
```

Destroy the contract




### logger

```solidity
function logger() external view returns (contract DefisaverLogger)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract DefisaverLogger | undefined

### removeStrategy

```solidity
function removeStrategy(uint256 _subId) external nonpayable
```

Unsubscribe an existing strategy

*Only callable by proxy who created the strategy*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _subId | uint256 | Subscription id

### strategies

```solidity
function strategies(uint256) external view returns (uint256 templateId, address proxy, bool active, uint256 posInUserArr)
```



*The order of strategies might change as they are deleted*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| templateId | uint256 | undefined
| proxy | address | undefined
| active | bool | undefined
| posInUserArr | uint256 | undefined

### templates

```solidity
function templates(uint256) external view returns (string name)
```



*Templates are fixed and are non removable*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| name | string | undefined

### updateCounter

```solidity
function updateCounter() external view returns (uint256)
```



*Increments on state change, used for easier off chain tracking of changes*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### updateStrategy

```solidity
function updateStrategy(uint256 _strategyId, uint256 _templateId, bool _active, bytes[][] _subData, bytes[][] _triggerData) external nonpayable
```

Updates the users strategy

*Only callable by proxy who created the strategy*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _strategyId | uint256 | Id of the strategy to update
| _templateId | uint256 | Id of the template used for strategy
| _active | bool | If the strategy is turned on at the start
| _subData | bytes[][] | Subscription data for actions
| _triggerData | bytes[][] | Subscription data for triggers

### userHasStrategies

```solidity
function userHasStrategies(address _user) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### usersPos

```solidity
function usersPos(address, uint256) external view returns (uint256)
```



*Keeps track of all the users strategies (their indexes in the array)*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined
| _1 | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

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




