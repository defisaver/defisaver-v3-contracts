# CompView









## Methods

### CETH_ADDRESS

```solidity
function CETH_ADDRESS() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### ETH_ADDRESS

```solidity
function ETH_ADDRESS() external view returns (address)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### comp

```solidity
function comp() external view returns (contract IComptroller)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IComptroller | undefined

### getCollFactors

```solidity
function getCollFactors(address[] _cTokens) external view returns (uint256[] collFactors)
```

Fetches Compound collateral factors for tokens



#### Parameters

| Name | Type | Description |
|---|---|---|
| _cTokens | address[] | Arr. of cTokens for which to get the coll. factors

#### Returns

| Name | Type | Description |
|---|---|---|
| collFactors | uint256[] | Array of coll. factors

### getFullTokensInfo

```solidity
function getFullTokensInfo(address[] _cTokenAddresses) external nonpayable returns (struct CompView.TokenInfoFull[] tokens)
```

Information about cTokens



#### Parameters

| Name | Type | Description |
|---|---|---|
| _cTokenAddresses | address[] | Array of cTokens addresses

#### Returns

| Name | Type | Description |
|---|---|---|
| tokens | CompView.TokenInfoFull[] | Array of cTokens infomartion

### getLoanData

```solidity
function getLoanData(address _user) external view returns (struct CompView.LoanData data)
```

Fetches all the collateral/debt address and amounts, denominated in usd



#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | Address of the user

#### Returns

| Name | Type | Description |
|---|---|---|
| data | CompView.LoanData | LoanData information

### getLoanDataArr

```solidity
function getLoanDataArr(address[] _users) external view returns (struct CompView.LoanData[] loans)
```

Fetches all the collateral/debt address and amounts, denominated in usd



#### Parameters

| Name | Type | Description |
|---|---|---|
| _users | address[] | Addresses of the user

#### Returns

| Name | Type | Description |
|---|---|---|
| loans | CompView.LoanData[] | Array of LoanData information

### getPrices

```solidity
function getPrices(address[] _cTokens) external view returns (uint256[] prices)
```

Fetches Compound prices for tokens



#### Parameters

| Name | Type | Description |
|---|---|---|
| _cTokens | address[] | Arr. of cTokens for which to get the prices

#### Returns

| Name | Type | Description |
|---|---|---|
| prices | uint256[] | Array of prices

### getRatio

```solidity
function getRatio(address _user) external view returns (uint256)
```

Calcualted the ratio of coll/debt for a compound user



#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | Address of the user

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getRatios

```solidity
function getRatios(address[] _users) external view returns (uint256[] ratios)
```

Calcualted the ratio of coll/debt for a compound user



#### Parameters

| Name | Type | Description |
|---|---|---|
| _users | address[] | Addresses of the user

#### Returns

| Name | Type | Description |
|---|---|---|
| ratios | uint256[] | Array of ratios

### getSafetyRatio

```solidity
function getSafetyRatio(address _user) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getTokenBalances

```solidity
function getTokenBalances(address _user, address[] _cTokens) external view returns (uint256[] balances, uint256[] borrows)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | undefined
| _cTokens | address[] | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| balances | uint256[] | undefined
| borrows | uint256[] | undefined

### getTokensInfo

```solidity
function getTokensInfo(address[] _cTokenAddresses) external nonpayable returns (struct CompView.TokenInfo[] tokens)
```

Information about cTokens



#### Parameters

| Name | Type | Description |
|---|---|---|
| _cTokenAddresses | address[] | Array of cTokens addresses

#### Returns

| Name | Type | Description |
|---|---|---|
| tokens | CompView.TokenInfo[] | Array of cTokens infomartion




