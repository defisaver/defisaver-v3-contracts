// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IERC20 } from "../interfaces/IERC20.sol";
import { IEVault } from "../interfaces/eulerV2/IEVault.sol";
import { IPriceOracle } from "../interfaces/eulerV2/IPriceOracle.sol";
import { IEVC } from "../interfaces/eulerV2/IEVC.sol";
import { IIRM } from "../interfaces/eulerV2/IIRM.sol";

import { EulerV2Helper } from "../actions/eulerV2/helpers/EulerV2Helper.sol";
import { TokenPriceHelper } from "../utils/TokenPriceHelper.sol";

/// @title EulerV2View - aggregate various information about Euler vaults and users
contract EulerV2View is EulerV2Helper, TokenPriceHelper {

    /*//////////////////////////////////////////////////////////////
                               CONSTANTS
    //////////////////////////////////////////////////////////////*/

    // When flag is set, debt socialization during liquidation is disabled
    uint32 constant CFG_DONT_SOCIALIZE_DEBT = 1 << 0;
    // max interest rate accepted from IRM. 1,000,000% APY: floor(((1000000 / 100 + 1)**(1/(86400*365.2425)) - 1) * 1e27)
    uint256 constant MAX_ALLOWED_INTEREST_RATE = 291867278914945094175;

    address public constant USD = address(840);

    uint256 internal constant MAX_ACCOUNTS_SIZE = 256;

    /*//////////////////////////////////////////////////////////////
                          DATA FORMAT
    //////////////////////////////////////////////////////////////*/

    /// @notice Collateral information
    struct CollateralInfo {
        address vaultAddr;                  // Address of the Euler vault
        address assetAddr;                  // Address of the underlying asset
        string vaultSymbol;                 // Vault symbol
        string name;                        // Vault name
        address governorAdmin;              // Address of the governor admin of the vault, or address zero if escrow vault for example
        bool isEscrowed;                    // Flag indicating whether the vault is escrowed meaning there is no borrow functionality
        uint256 decimals;                   // Decimals, the same as the asset's or 18 if the asset doesn't implement `decimals()`
        uint256 sharePriceInUnit;           // Price of one share in the unit of account. Scaled by 1e18
        uint256 assetPriceInUnit;           // Price of one asset in the unit of account. Scaled by 1e18
        uint256 cash;                       // Balance of vault assets as tracked by deposits/withdrawals and borrows/repays
        uint256 totalBorrows;               // Sum of all outstanding debts, in underlying units (increases as interest is accrued)
        uint256 supplyCap;                  // Maximum total amount of assets that can be supplied to the vault
        uint16 borrowLTV;                   // The current value of borrow LTV for originating positions
        uint16 liquidationLTV;              // The value of fully converged liquidation LTV
        uint16 initialLiquidationLTV;       // The initial value of the liquidation LTV, when the ramp began
        uint48 targetTimestamp;             // The timestamp when the liquidation LTV is considered fully converged
        uint32 rampDuration;                // The time it takes for the liquidation LTV to converge from the initial value to the fully converged value
        uint256 interestFee;                // Interest that is redirected as a fee, as a fraction scaled by 1e4
        uint256 interestRate;               // Current borrow interest rate for an asset in yield-per-second, scaled by 10**27
    }

    /// @notice Full information about a vault
    struct VaultInfoFull {
        address vaultAddr;                  // Address of the Euler vault
        address assetAddr;                  // Address of the underlying asset 
        string name;                        // Vault name
        string symbol;                      // Vault symbol
        uint256 decimals;                   // Decimals, the same as the asset's or 18 if the asset doesn't implement `decimals()`
        uint256 totalSupplyShares;          // Total supply shares. Sum of all eTokens balances
        uint256 cash;                       // Balance of vault assets as tracked by deposits/withdrawals and borrows/repays
        uint256 totalBorrows;               // Sum of all outstanding debts, in underlying units (increases as interest is accrued)
        uint256 totalAssets;                // Total amount of managed assets, cash + borrows
        uint256 supplyCap;                  // Maximum total amount of assets that can be supplied to the vault
        uint256 borrowCap;                  // Maximum total amount of assets that can be borrowed from the vault
        CollateralInfo[] collaterals;       // Supported collateral assets with their LTV configurations
        uint16 maxLiquidationDiscount;      // The maximum liquidation discount in 1e4 scale
        uint256 liquidationCoolOffTime;     // Liquidation cool-off time, which must elapse after successful account status check before
        bool badDebtSocializationEnabled;   // Flag indicating whether bad debt socialization is enabled
        address unitOfAccount;              // Reference asset used for liquidity calculations
        uint256 unitOfAccountInUsd;         // If unit of account is not USD, fetch its price in USD from chainlink in 1e8 scale
        address oracle;                     // Address of the oracle contract
        uint256 assetPriceInUnit;           // Price of one asset in the unit of account, scaled by 1e18
        uint256 sharePriceInUnit;           // Price of one share in the unit of account, scaled by 1e18
        uint256 interestRate;               // Current borrow interest rate for an asset in yield-per-second, scaled by 10**27
        address irm;                        // Address of the interest rate contract or address zero to indicate 0% interest
        address balanceTrackerAddress;      // Retrieve the address of rewards contract, tracking changes in account's balances
        address creator;                    // Address of the creator of the vault
        address governorAdmin;              // Address of the governor admin of the vault, or address zero if escrow vault for example
        uint256 interestFee;                // Interest that is redirected as a fee, as a fraction scaled by 1e4
    }

    /// @notice User collateral information   
    struct UserCollateralInfo {
        address collateralVault;            // Address of the collateral vault
        bool usedInBorrow;                  // Flag indicating whether the collateral is used by the current user controller (if one exists)
        uint256 collateralAmountInUnit;     // Amount of collateral in unit of account. If coll is NOT supported by the borrow vault, returns 0
        uint256 collateralAmountInAsset;    // Amount of collateral in asset's decimals

        uint256 collateralAmountInUSD;      // Amount of collateral in USD, in 18 decimals
                                            // If collateralAmountInUnit is present AND unit of account is USD, this will be the same as collateralAmountInUnit
                                            // If collateralAmountInUnit is present AND unit of account is not USD, this will return chainlink price in USD
                                            // If collateralAmountInUnit is NOT present, this will return chainlink price in USD
    }

    /// @notice User data with loan information
    struct UserData {
        address user;                       // Address of the user
        address owner;                      // Address of the owner address space. Same as user if user is not a sub-account
        bool inLockDownMode;                // Flag indicating whether the account is in lockdown mode
        bool inPermitDisabledMode;          // Flag indicating whether the account is in permit disabled mode
        address borrowVault;                // Address of the borrow vault (aka controller)
        uint256 borrowAmountInUnit;         // Amount of borrowed assets in the unit of account
        uint256 borrowAmountInAsset;        // Amount of borrowed assets in the asset's decimals
        UserCollateralInfo[] collaterals;   // Collaterals information
    }

    /// @notice Used for borrow rate estimation
    /// @notice if isBorrowOperation => (liquidityAdded = repay, liquidityRemoved = borrow)
    /// @notice if not, look at it as supply/withdraw operation => (liquidityAdded = supply, liquidityRemoved = withdraw)
    struct LiquidityChangeParams {
        address vault;                      // Address of the Euler vault          
        bool isBorrowOperation;             // Flag indicating whether the operation is a borrow operation (repay/borrow), otherwise supply/withdraw
        uint256 liquidityAdded;             // Amount of liquidity added to the vault
        uint256 liquidityRemoved;           // Amount of liquidity removed from the vault
    }

    /*//////////////////////////////////////////////////////////////
                                EXTERNAL
    //////////////////////////////////////////////////////////////*/

    /// @notice Get list of users load data
    function getUsersData(address[] calldata _users) external view returns (UserData[] memory data) {
        data = new UserData[](_users.length);
        for (uint256 i = 0; i < _users.length; ++i) {
            data[i] = getUserData(_users[i]);
        }
    }

    /// @notice Get loan data for a user
    function getUserData(address _user) public view returns (UserData memory data) {
        bytes19 addressPrefix = getAddressPrefixInternal(_user);

        address[] memory controllers = IEVC(EVC_ADDR).getControllers(_user);
        address[] memory collaterals = IEVC(EVC_ADDR).getCollaterals(_user);
        UserCollateralInfo[] memory collateralsInfo = new UserCollateralInfo[](collaterals.length);

        address controller = (controllers.length > 0) ? controllers[0] : address(0);

        uint256 borrowAmountInUnit;
        uint256 borrowAmountInAsset;
        address unitOfAccount;
        address oracle;
        if (controller != address(0)) {
            unitOfAccount = IEVault(controller).unitOfAccount();
            oracle = IEVault(controller).oracle();
            borrowAmountInAsset = IEVault(controller).debtOf(_user);
            borrowAmountInUnit = _getOracleAmountInUnitOfAccount(
                oracle,
                IEVault(controller).asset(),
                unitOfAccount,
                borrowAmountInAsset
            );
        }

        for (uint256 i = 0; i < collaterals.length; ++i) {
            collateralsInfo[i] = _getUserCollateralInfo(
                _user,
                collaterals[i],
                controller,
                unitOfAccount,
                oracle
            );
        }

        data = UserData({
            user: _user,
            owner: IEVC(EVC_ADDR).getAccountOwner(_user),
            inLockDownMode: IEVC(EVC_ADDR).isLockdownMode(addressPrefix),
            inPermitDisabledMode: IEVC(EVC_ADDR).isPermitDisabledMode(addressPrefix),
            borrowVault: controller,
            borrowAmountInUnit: borrowAmountInUnit,
            borrowAmountInAsset: borrowAmountInAsset,
            collaterals: collateralsInfo
        });
    }

    /// @notice Get list of vaults with full information
    function getVaultsInfosFull(address[] calldata _vaults) external view returns (VaultInfoFull[] memory data) {
        data = new VaultInfoFull[](_vaults.length);
        for (uint256 i = 0; i < _vaults.length; ++i) {
            data[i] = getVaultInfoFull(_vaults[i]);
        }
    }

    /// @notice Get full information about a vault
    function getVaultInfoFull(address _vault) public view returns (VaultInfoFull memory data) {
        IEVault v = IEVault(_vault);

        (uint16 supplyCap, uint16 borrowCap) = v.caps();
        uint32 configFlags = v.configFlags();
        address oracle = v.oracle();
        address asset = v.asset();
        address unitOfAccount = v.unitOfAccount();

        CollateralInfo[] memory collaterals = _getVaultCollaterals(_vault, unitOfAccount, oracle);

        data = VaultInfoFull({
            vaultAddr: _vault,
            assetAddr: asset,
            name: v.name(),
            symbol: v.symbol(),
            decimals: v.decimals(),
            totalSupplyShares: v.totalSupply(),
            cash: v.cash(),
            totalBorrows: v.totalBorrows(),
            totalAssets: v.totalAssets(),
            supplyCap: _resolveAmountCap(supplyCap),
            borrowCap: _resolveAmountCap(borrowCap),
            collaterals: collaterals,
            maxLiquidationDiscount: v.maxLiquidationDiscount(),
            liquidationCoolOffTime: v.liquidationCoolOffTime(),
            badDebtSocializationEnabled: configFlags & CFG_DONT_SOCIALIZE_DEBT == 0,
            unitOfAccount: unitOfAccount,
            unitOfAccountInUsd: unitOfAccount == USD ? 0 : getPriceInUSD(unitOfAccount),
            oracle: oracle,
            assetPriceInUnit: _getOraclePriceInUnitOfAccount(oracle, asset, unitOfAccount),
            sharePriceInUnit: _getOraclePriceInUnitOfAccount(oracle, _vault, unitOfAccount),
            interestRate: v.interestRate(),
            irm: v.interestRateModel(),
            balanceTrackerAddress: v.balanceTrackerAddress(),
            creator: v.creator(),
            governorAdmin: v.governorAdmin(),
            interestFee: v.interestFee()
        });
    }

    /// @notice Get list of collaterals for a vault
    function getVaultCollaterals(address _vault) public view returns (CollateralInfo[] memory collateralsInfo) {
        address unitOfAccount = IEVault(_vault).unitOfAccount();
        address oracle = IEVault(_vault).oracle();
        collateralsInfo = _getVaultCollaterals(_vault, unitOfAccount, oracle);
    }

    /// @notice Fetches used accounts, including sub-accounts
    function fetchUsedAccounts(address _account, uint256 _page, uint256 _perPage) 
        external
        view
        returns (
            address owner,
            address[] memory accounts
        ) 
    {
        require(_perPage >= 1 && _perPage <= MAX_ACCOUNTS_SIZE);

        accounts = new address[](_perPage);

        owner = IEVC(EVC_ADDR).getAccountOwner(_account);

        // if no main account is registered, return empty array, meaning account address space is free
        if (owner == address(0)) {
            return (owner, accounts);
        }

        bytes19 addressPrefix = getAddressPrefixInternal(_account);

        uint256 start = _page * _perPage;
        uint256 end = start + _perPage;
        end = (end > MAX_ACCOUNTS_SIZE) ? MAX_ACCOUNTS_SIZE : end;

        uint256 cnt;
        for (uint256 i = start; i < end; ++i) {
            address subAccount = getSubAccountByPrefix(addressPrefix, bytes1(uint8(i)));
            address[] memory controllers = IEVC(EVC_ADDR).getControllers(subAccount);
            if (controllers.length > 0) {
                accounts[cnt] = subAccount;
            } else {
                address[] memory collaterals = IEVC(EVC_ADDR).getCollaterals(subAccount);
                accounts[cnt] = collaterals.length > 0 ? subAccount : address(0);
            }
            cnt++;
        }
    }

    /// @notice Get borrow rate estimation after liquidity change
    /// @dev Should be called with staticcall
    function getApyAfterValuesEstimation(LiquidityChangeParams[] memory params) 
        public returns (uint256[] memory estimatedBorrowRates) 
    {
        estimatedBorrowRates = new uint256[](params.length);
        for (uint256 i = 0; i < params.length; ++i) {
            IEVault v = IEVault(params[i].vault);
            v.touch();

            address irm = v.interestRateModel();
            if (irm == address(0)) {
                estimatedBorrowRates[i] = 0;
                continue;
            }

            uint256 oldInterestRate = v.interestRate();
            uint256 cash = v.cash();
            uint256 totalBorrows = v.totalBorrows();
            
            if (params[i].isBorrowOperation) {
                // when repaying
                if (params[i].liquidityAdded > 0) {
                    cash += params[i].liquidityAdded;
                    totalBorrows = totalBorrows > params[i].liquidityAdded ? totalBorrows - params[i].liquidityAdded : 0;
                }
                // when borrowing
                if (params[i].liquidityRemoved > 0) {
                    cash = cash > params[i].liquidityRemoved ? cash - params[i].liquidityRemoved : 0;
                    totalBorrows += params[i].liquidityRemoved;
                }
            } else {
                // when supplying
                if (params[i].liquidityAdded > 0) {
                    cash += params[i].liquidityAdded;
                }
                // when withdrawing
                if (params[i].liquidityRemoved > 0) {
                    cash = cash > params[i].liquidityRemoved ? cash - params[i].liquidityRemoved : 0;
                }
            }

            (bool success, bytes memory data) = irm.staticcall(
                abi.encodeCall(
                    IIRM.computeInterestRateView,
                    (address(this), cash, totalBorrows)
                )
            );

            if (success && data.length >= 32) {
                uint256 newInterestRate = abi.decode(data, (uint256));
                if (newInterestRate > MAX_ALLOWED_INTEREST_RATE) {
                    newInterestRate = MAX_ALLOWED_INTEREST_RATE;
                }
                estimatedBorrowRates[i] = newInterestRate;
            } else {
                estimatedBorrowRates[i] = oldInterestRate;
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL METHODS
    //////////////////////////////////////////////////////////////*/

    function _getUserCollateralInfo(
        address _user,
        address _collateral,
        address _controller,
        address _unitOfAccount,
        address _oracle
    ) internal view returns (UserCollateralInfo memory data) {

        uint256 collateralAmountInUnit;

        if (_controller != address(0)) {
            uint16 borrowLTV = IEVault(_controller).LTVBorrow(_collateral);
            if (borrowLTV != 0) {
                uint256 userCollBalance = IEVault(_collateral).balanceOf(_user);
                collateralAmountInUnit = _getOracleAmountInUnitOfAccount(
                    _oracle,
                    _collateral,
                    _unitOfAccount,
                    userCollBalance
                );
            }
        }
        
        IEVault collVault = IEVault(_collateral);
        
        data.collateralVault = _collateral;
        data.collateralAmountInUnit = collateralAmountInUnit;
        data.usedInBorrow = collateralAmountInUnit != 0;
        data.collateralAmountInAsset = collVault.convertToAssets(collVault.balanceOf(_user));

        if (data.usedInBorrow) {
            if (_unitOfAccount == USD) {
                data.collateralAmountInUSD = collateralAmountInUnit;
            } else {
                uint256 dec = IERC20(_unitOfAccount).decimals();
                uint256 collAmountUnitWAD = dec > 18
                    ? data.collateralAmountInUnit / 10 ** (dec - 18)
                    : data.collateralAmountInUnit * 10 ** (18 - dec);
                uint256 unitPriceWAD = getPriceInUSD(_unitOfAccount) * 1e10; 
                data.collateralAmountInUSD = wmul(collAmountUnitWAD, unitPriceWAD);
            }
        } else {
            uint256 dec = collVault.decimals();
            uint256 collAmountWAD = dec > 18
                ? data.collateralAmountInAsset / 10 ** (dec - 18)
                : data.collateralAmountInAsset * 10 ** (18 - dec);
            uint256 assetPriceWAD = getPriceInUSD(collVault.asset()) * 1e10;
            data.collateralAmountInUSD = wmul(collAmountWAD, assetPriceWAD);
        }
    }

    function _getVaultCollaterals(address _vault, address _unitOfAccount, address _oracle) internal view returns (CollateralInfo[] memory collateralsInfo) {
        address[] memory collaterals = IEVault(_vault).LTVList();
        collateralsInfo = new CollateralInfo[](collaterals.length);
        
        for (uint256 i = 0; i < collaterals.length; ++i) {
            (
                collateralsInfo[i].borrowLTV,
                collateralsInfo[i].liquidationLTV,
                collateralsInfo[i].initialLiquidationLTV,
                collateralsInfo[i].targetTimestamp,
                collateralsInfo[i].rampDuration
            ) = IEVault(_vault).LTVFull(collaterals[i]);
            
            collateralsInfo[i].vaultAddr = collaterals[i];
            collateralsInfo[i].name = IEVault(collaterals[i]).name();
            collateralsInfo[i].governorAdmin = IEVault(collaterals[i]).governorAdmin();
            collateralsInfo[i].isEscrowed = IEVault(collaterals[i]).LTVList().length == 0;
            collateralsInfo[i].assetAddr = IEVault(collaterals[i]).asset();
            collateralsInfo[i].vaultSymbol = IEVault(collaterals[i]).symbol();
            collateralsInfo[i].decimals = IEVault(collaterals[i]).decimals();

            collateralsInfo[i].sharePriceInUnit = _getOraclePriceInUnitOfAccount(
                _oracle,
                collaterals[i],
                _unitOfAccount
            );

            collateralsInfo[i].assetPriceInUnit = _getOraclePriceInUnitOfAccount(
                _oracle,
                collateralsInfo[i].assetAddr,
                _unitOfAccount
            );

            collateralsInfo[i].cash = IEVault(collaterals[i]).cash();
            collateralsInfo[i].totalBorrows = IEVault(collaterals[i]).totalBorrows();

            (uint16 supplyCap,) = IEVault(collaterals[i]).caps();
            collateralsInfo[i].supplyCap = _resolveAmountCap(supplyCap);

            collateralsInfo[i].interestFee = IEVault(collaterals[i]).interestFee();
            collateralsInfo[i].interestRate = IEVault(collaterals[i]).interestRate();
        }
    }

    function _getOraclePriceInUnitOfAccount(
        address _oracle,
        address _token,
        address _unitOfAccount
    ) internal view returns (uint256 price) {
        uint256 decimals = IEVault(_token).decimals();
        uint256 inAmount = 10 ** decimals;
        
        if (_oracle != address(0)) {
            try IPriceOracle(_oracle).getQuote(inAmount, _token, _unitOfAccount) returns (uint256 quote) {
                return quote;
            } catch {
                return 0;
            }
        }
    }

    function _getOracleAmountInUnitOfAccount(
        address _oracle,
        address _token,
        address _unitOfAccount,
        uint256 _amount
    ) internal view returns (uint256 price) {
        if (_oracle != address(0)) {
            try IPriceOracle(_oracle).getQuote(_amount, _token, _unitOfAccount) returns (uint256 quote) {
                return quote;
            } catch {
                return 0;
            }
        }
    }

    function _resolveAmountCap(uint16 amountCap) internal pure returns (uint256) {
        if (amountCap == 0) return type(uint256).max;
        return 10 ** (amountCap & 63) * (amountCap >> 6) / 100;
    }
}