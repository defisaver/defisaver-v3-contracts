# ILendingPoolAddressesProviderV2









## Methods

### getAddress

```solidity
function getAddress(bytes32 id) external view returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| id | bytes32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### getEmergencyAdmin

```solidity
function getEmergencyAdmin() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### getLendingPool

```solidity
function getLendingPool() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### getLendingPoolCollateralManager

```solidity
function getLendingPoolCollateralManager() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### getLendingPoolConfigurator

```solidity
function getLendingPoolConfigurator() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### getLendingRateOracle

```solidity
function getLendingRateOracle() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### getPoolAdmin

```solidity
function getPoolAdmin() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### getPriceOracle

```solidity
function getPriceOracle() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### setAddress

```solidity
function setAddress(bytes32 id, address newAddress) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| id | bytes32 | undefined
| newAddress | address | undefined

### setAddressAsProxy

```solidity
function setAddressAsProxy(bytes32 id, address impl) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| id | bytes32 | undefined
| impl | address | undefined

### setEmergencyAdmin

```solidity
function setEmergencyAdmin(address admin) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| admin | address | undefined

### setLendingPoolCollateralManager

```solidity
function setLendingPoolCollateralManager(address manager) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| manager | address | undefined

### setLendingPoolConfiguratorImpl

```solidity
function setLendingPoolConfiguratorImpl(address configurator) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| configurator | address | undefined

### setLendingPoolImpl

```solidity
function setLendingPoolImpl(address pool) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| pool | address | undefined

### setLendingRateOracle

```solidity
function setLendingRateOracle(address lendingRateOracle) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| lendingRateOracle | address | undefined

### setPoolAdmin

```solidity
function setPoolAdmin(address admin) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| admin | address | undefined

### setPriceOracle

```solidity
function setPriceOracle(address priceOracle) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| priceOracle | address | undefined



## Events

### AddressSet

```solidity
event AddressSet(bytes32 id, address indexed newAddress, bool hasProxy)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| id  | bytes32 | undefined |
| newAddress `indexed` | address | undefined |
| hasProxy  | bool | undefined |

### ConfigurationAdminUpdated

```solidity
event ConfigurationAdminUpdated(address indexed newAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| newAddress `indexed` | address | undefined |

### EmergencyAdminUpdated

```solidity
event EmergencyAdminUpdated(address indexed newAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| newAddress `indexed` | address | undefined |

### LendingPoolCollateralManagerUpdated

```solidity
event LendingPoolCollateralManagerUpdated(address indexed newAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| newAddress `indexed` | address | undefined |

### LendingPoolConfiguratorUpdated

```solidity
event LendingPoolConfiguratorUpdated(address indexed newAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| newAddress `indexed` | address | undefined |

### LendingPoolUpdated

```solidity
event LendingPoolUpdated(address indexed newAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| newAddress `indexed` | address | undefined |

### LendingRateOracleUpdated

```solidity
event LendingRateOracleUpdated(address indexed newAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| newAddress `indexed` | address | undefined |

### PriceOracleUpdated

```solidity
event PriceOracleUpdated(address indexed newAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| newAddress `indexed` | address | undefined |

### ProxyCreated

```solidity
event ProxyCreated(bytes32 id, address indexed newAddress)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| id  | bytes32 | undefined |
| newAddress `indexed` | address | undefined |



