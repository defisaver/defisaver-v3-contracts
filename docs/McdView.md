# McdView



> Getter contract for Vault info from Maker protocol





## Methods

### MANAGER_ADDRESS

```solidity
function MANAGER_ADDRESS() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### SPOTTER_ADDRESS

```solidity
function SPOTTER_ADDRESS() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### VAT_ADDRESS

```solidity
function VAT_ADDRESS() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### getPrice

```solidity
function getPrice(bytes32 _ilk) external view returns (uint256)
```

Gets a price of the asset



#### Parameters

| Name | Type | Description |
|---|---|---|
| _ilk | bytes32 | Ilk of the Vault

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getRatio

```solidity
function getRatio(uint256 _vaultId) external view returns (uint256)
```

Gets Vaults ratio



#### Parameters

| Name | Type | Description |
|---|---|---|
| _vaultId | uint256 | Id of the Vault

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getVaultInfo

```solidity
function getVaultInfo(uint256 _vaultId, bytes32 _ilk) external view returns (uint256, uint256)
```

Gets Vault info (collateral, debt)



#### Parameters

| Name | Type | Description |
|---|---|---|
| _vaultId | uint256 | Id of the Vault
| _ilk | bytes32 | Ilk of the Vault

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined
| _1 | uint256 | undefined

### manager

```solidity
function manager() external view returns (contract IManager)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IManager | undefined

### spotter

```solidity
function spotter() external view returns (contract ISpotter)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract ISpotter | undefined

### vat

```solidity
function vat() external view returns (contract IVat)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IVat | undefined




