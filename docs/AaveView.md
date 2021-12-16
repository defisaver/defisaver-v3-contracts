# AaveView









## Methods

### AAVE_REFERRAL_CODE

```solidity
function AAVE_REFERRAL_CODE() external view returns (uint16)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint16 | undefined

### AaveIncentivesController

```solidity
function AaveIncentivesController() external view returns (contract IAaveIncentivesController)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IAaveIncentivesController | undefined

### DATA_PROVIDER_ID

```solidity
function DATA_PROVIDER_ID() external view returns (bytes32)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bytes32 | undefined

### STABLE_ID

```solidity
function STABLE_ID() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### StakedToken

```solidity
function StakedToken() external view returns (contract IStakedToken)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IStakedToken | undefined

### VARIABLE_ID

```solidity
function VARIABLE_ID() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### enableAsCollateral

```solidity
function enableAsCollateral(address _market, address _tokenAddr, bool _useAsCollateral) external nonpayable
```

Enable/Disable a token as collateral for the specified Aave market



#### Parameters

| Name | Type | Description |
|---|---|---|
| _market | address | undefined
| _tokenAddr | address | undefined
| _useAsCollateral | bool | undefined

### getCollFactors

```solidity
function getCollFactors(address _market, address[] _tokens) external view returns (uint256[] collFactors)
```

Fetches Aave collateral factors for tokens



#### Parameters

| Name | Type | Description |
|---|---|---|
| _market | address | Address of LendingPoolAddressesProvider for specific market
| _tokens | address[] | Arr. of tokens for which to get the coll. factors

#### Returns

| Name | Type | Description |
|---|---|---|
| collFactors | uint256[] | Array of coll. factors

### getFullTokensInfo

```solidity
function getFullTokensInfo(address _market, address[] _tokenAddresses) external view returns (struct AaveView.TokenInfoFull[] tokens)
```

Information about reserves



#### Parameters

| Name | Type | Description |
|---|---|---|
| _market | address | Address of LendingPoolAddressesProvider for specific market
| _tokenAddresses | address[] | Array of token addresses

#### Returns

| Name | Type | Description |
|---|---|---|
| tokens | AaveView.TokenInfoFull[] | Array of reserves information

### getIncentivesRewardsBalance

```solidity
function getIncentivesRewardsBalance(address[] _assets, address _user) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _assets | address[] | undefined
| _user | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getLoanData

```solidity
function getLoanData(address _market, address _user) external view returns (struct AaveView.LoanData data)
```

Fetches all the collateral/debt address and amounts, denominated in ether



#### Parameters

| Name | Type | Description |
|---|---|---|
| _market | address | Address of LendingPoolAddressesProvider for specific market
| _user | address | Address of the user

#### Returns

| Name | Type | Description |
|---|---|---|
| data | AaveView.LoanData | LoanData information

### getLoanDataArr

```solidity
function getLoanDataArr(address _market, address[] _users) external view returns (struct AaveView.LoanData[] loans)
```

Fetches all the collateral/debt address and amounts, denominated in ether



#### Parameters

| Name | Type | Description |
|---|---|---|
| _market | address | Address of LendingPoolAddressesProvider for specific market
| _users | address[] | Addresses of the user

#### Returns

| Name | Type | Description |
|---|---|---|
| loans | AaveView.LoanData[] | Array of LoanData information

### getPrices

```solidity
function getPrices(address _market, address[] _tokens) external view returns (uint256[] prices)
```

Fetches Aave prices for tokens



#### Parameters

| Name | Type | Description |
|---|---|---|
| _market | address | Address of LendingPoolAddressesProvider for specific market
| _tokens | address[] | Arr. of tokens for which to get the prices

#### Returns

| Name | Type | Description |
|---|---|---|
| prices | uint256[] | Array of prices

### getRatio

```solidity
function getRatio(address _market, address _user) external view returns (uint256)
```

Calculated the ratio of coll/debt for a compound user



#### Parameters

| Name | Type | Description |
|---|---|---|
| _market | address | Address of LendingPoolAddressesProvider for specific market
| _user | address | Address of the user

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getRatios

```solidity
function getRatios(address _market, address[] _users) external view returns (uint256[] ratios)
```

Calculated the ratio of coll/debt for an aave user



#### Parameters

| Name | Type | Description |
|---|---|---|
| _market | address | Address of LendingPoolAddressesProvider for specific market
| _users | address[] | Addresses of the user

#### Returns

| Name | Type | Description |
|---|---|---|
| ratios | uint256[] | Array of ratios

### getSafetyRatio

```solidity
function getSafetyRatio(address _market, address _user) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _market | address | undefined
| _user | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getStakingRewardsBalance

```solidity
function getStakingRewardsBalance(address _staker) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _staker | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getTokenBalances

```solidity
function getTokenBalances(address _market, address _user, address[] _tokens) external view returns (struct AaveView.UserToken[] userTokens)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _market | address | undefined
| _user | address | undefined
| _tokens | address[] | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| userTokens | AaveView.UserToken[] | undefined

### getTokensInfo

```solidity
function getTokensInfo(address _market, address[] _tokenAddresses) external view returns (struct AaveView.TokenInfo[] tokens)
```

Information about reserves



#### Parameters

| Name | Type | Description |
|---|---|---|
| _market | address | Address of LendingPoolAddressesProvider for specific market
| _tokenAddresses | address[] | Array of tokens addresses

#### Returns

| Name | Type | Description |
|---|---|---|
| tokens | AaveView.TokenInfo[] | Array of reserves information

### getUserUnclaimedRewards

```solidity
function getUserUnclaimedRewards(address _user) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _user | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### switchRateMode

```solidity
function switchRateMode(address _market, address _tokenAddr, uint256 _rateMode) external nonpayable
```

Switches the borrowing rate mode (stable/variable) for the user



#### Parameters

| Name | Type | Description |
|---|---|---|
| _market | address | undefined
| _tokenAddr | address | undefined
| _rateMode | uint256 | undefined




