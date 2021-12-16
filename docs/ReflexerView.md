# ReflexerView









## Methods

### GET_SAFES_ADDR

```solidity
function GET_SAFES_ADDR() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### MANAGER_ADDR

```solidity
function MANAGER_ADDR() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### MEDIAN_ORACLE_ADDRESS

```solidity
function MEDIAN_ORACLE_ADDRESS() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### ORACLE_RELAYER_ADDRESS

```solidity
function ORACLE_RELAYER_ADDRESS() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### SAFE_ENGINE_ADDRESS

```solidity
function SAFE_ENGINE_ADDRESS() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### TAX_COLLECTOR_ADDRESS

```solidity
function TAX_COLLECTOR_ADDRESS() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### getCollAndRaiInfo

```solidity
function getCollAndRaiInfo(bytes32 _collType) external nonpayable returns (struct ReflexerView.CollInfo collInfo, struct ReflexerView.RaiInfo raiInfo)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _collType | bytes32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| collInfo | ReflexerView.CollInfo | undefined
| raiInfo | ReflexerView.RaiInfo | undefined

### getCollateralTypeInfo

```solidity
function getCollateralTypeInfo(bytes32 _collType) external nonpayable returns (struct ReflexerView.CollInfo collInfo)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _collType | bytes32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| collInfo | ReflexerView.CollInfo | undefined

### getFullInfo

```solidity
function getFullInfo(address _user, bytes32 _collType) external nonpayable returns (struct ReflexerView.CollInfo collInfo, struct ReflexerView.RaiInfo raiInfo, struct ReflexerView.SafeInfo[] safeInfos)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | undefined
| _collType | bytes32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| collInfo | ReflexerView.CollInfo | undefined
| raiInfo | ReflexerView.RaiInfo | undefined
| safeInfos | ReflexerView.SafeInfo[] | undefined

### getPrice

```solidity
function getPrice(bytes32 _collType) external nonpayable returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _collType | bytes32 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getRaiInfo

```solidity
function getRaiInfo() external nonpayable returns (struct ReflexerView.RaiInfo raiInfo)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| raiInfo | ReflexerView.RaiInfo | undefined

### getSafeInfo

```solidity
function getSafeInfo(uint256 _safeId) external view returns (struct ReflexerView.SafeInfo safeInfo)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _safeId | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| safeInfo | ReflexerView.SafeInfo | undefined

### getUserSafes

```solidity
function getUserSafes(address _user) external view returns (uint256[] ids, address[] safes, bytes32[] collateralTypes)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| ids | uint256[] | undefined
| safes | address[] | undefined
| collateralTypes | bytes32[] | undefined

### getUserSafesFullInfo

```solidity
function getUserSafesFullInfo(address _user) external view returns (struct ReflexerView.SafeInfo[] safeInfos)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| safeInfos | ReflexerView.SafeInfo[] | undefined




