// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../DS/DSMath.sol";
import "../utils/Exponential.sol";
import "../interfaces/compound/IComptroller.sol";
import "../interfaces/compound/ICToken.sol";
import "../interfaces/compound/ICompoundOracle.sol";

contract CompView is Exponential, DSMath {

    struct LoanData {
        address user;
        uint128 ratio;
        address[] collAddr;
        address[] borrowAddr;
        uint[] collAmounts;
        uint[] borrowAmounts;
    }

    struct TokenInfo {
        address cTokenAddress;
        address underlyingTokenAddress;
        uint collateralFactor;
        uint price;
    }

    struct TokenInfoFull {
        address underlyingTokenAddress;
        uint supplyRate;
        uint borrowRate;
        uint exchangeRate;
        uint marketLiquidity;
        uint totalSupply;
        uint totalBorrow;
        uint collateralFactor;
        uint price;
    }

    address public constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant CETH_ADDRESS = 0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5;
    address public constant COMP_ADDR = 0xc00e94Cb662C3520282E6f5717214004A7f26888;
    address public constant COMPTROLLER_ADDR = 0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B;

    uint224 public constant compInitialIndex = 1e36;

     // solhint-disable-next-line const-name-snakecase
    IComptroller public constant Comptroller = IComptroller(COMPTROLLER_ADDR);

    /// @notice Calculated the ratio of debt / adjusted collateral
    /// @param _user Address of the user
    function getSafetyRatio(address _user) public view returns (uint) {
        // For each asset the account is in
        address[] memory assets = Comptroller.getAssetsIn(_user);
        address oracleAddr = Comptroller.oracle();


        uint sumCollateral = 0;
        uint sumBorrow = 0;

        for (uint i = 0; i < assets.length; i++) {
            address asset = assets[i];

            (, uint cTokenBalance, uint borrowBalance, uint exchangeRateMantissa)
                                        = ICToken(asset).getAccountSnapshot(_user);

            Exp memory oraclePrice;

            if (cTokenBalance != 0 || borrowBalance != 0) {
                oraclePrice = Exp({mantissa: ICompoundOracle(oracleAddr).getUnderlyingPrice(asset)});
            }

            // Sum up collateral in Usd
            if (cTokenBalance != 0) {

                (, uint collFactorMantissa) = Comptroller.markets(address(asset));

                Exp memory collateralFactor = Exp({mantissa: collFactorMantissa});
                Exp memory exchangeRate = Exp({mantissa: exchangeRateMantissa});

                (, Exp memory tokensToUsd) = mulExp3(collateralFactor, exchangeRate, oraclePrice);

                (, sumCollateral) = mulScalarTruncateAddUInt(tokensToUsd, cTokenBalance, sumCollateral);
            }

            // Sum up debt in Usd
            if (borrowBalance != 0) {
                (, sumBorrow) = mulScalarTruncateAddUInt(oraclePrice, borrowBalance, sumBorrow);
            }
        }

        if (sumBorrow == 0) return type(uint).max;

        uint borrowPowerUsed = (sumBorrow * 10**18) / sumCollateral;
        return wdiv(1e18, borrowPowerUsed);
    }


    /// @notice Calculated the ratio of coll/debt for a compound user
    /// @param _user Address of the user
    function getRatio(address _user) public view returns (uint) {
        // For each asset the account is in
        return getSafetyRatio(_user);
    }

    /// @notice Fetches Compound prices for tokens
    /// @param _cTokens Arr. of cTokens for which to get the prices
    /// @return prices Array of prices
    function getPrices(address[] memory _cTokens) public view returns (uint[] memory prices) {
        prices = new uint[](_cTokens.length);
        address oracleAddr = Comptroller.oracle();

        for (uint i = 0; i < _cTokens.length; ++i) {
            prices[i] = ICompoundOracle(oracleAddr).getUnderlyingPrice(_cTokens[i]);
        }
    }

    /// @notice Fetches Compound collateral factors for tokens
    /// @param _cTokens Arr. of cTokens for which to get the coll. factors
    /// @return collFactors Array of coll. factors
    function getCollFactors(address[] memory _cTokens) public view returns (uint[] memory collFactors) {
        collFactors = new uint[](_cTokens.length);

        for (uint i = 0; i < _cTokens.length; ++i) {
            (, collFactors[i]) = Comptroller.markets(_cTokens[i]);
        }
    }

    /// @notice Fetches all the collateral/debt address and amounts, denominated in usd
    /// @param _user Address of the user
    /// @return data LoanData information
    function getLoanData(address _user) public view returns (LoanData memory data) {
        address[] memory assets = Comptroller.getAssetsIn(_user);
        address oracleAddr = Comptroller.oracle();

        data = LoanData({
            user: _user,
            ratio: 0,
            collAddr: new address[](assets.length),
            borrowAddr: new address[](assets.length),
            collAmounts: new uint[](assets.length),
            borrowAmounts: new uint[](assets.length)
        });

        uint collPos = 0;
        uint borrowPos = 0;

        for (uint i = 0; i < assets.length; i++) {
            address asset = assets[i];

            (, uint cTokenBalance, uint borrowBalance, uint exchangeRateMantissa)
                                        = ICToken(asset).getAccountSnapshot(_user);

            Exp memory oraclePrice;

            if (cTokenBalance != 0 || borrowBalance != 0) {
                oraclePrice = Exp({mantissa: ICompoundOracle(oracleAddr).getUnderlyingPrice(asset)});
            }

            // Sum up collateral in Usd
            if (cTokenBalance != 0) {
                Exp memory exchangeRate = Exp({mantissa: exchangeRateMantissa});
                (, Exp memory tokensToUsd) = mulExp(exchangeRate, oraclePrice);

                data.collAddr[collPos] = asset;
                (, data.collAmounts[collPos]) = mulScalarTruncate(tokensToUsd, cTokenBalance);
                collPos++;
            }

            // Sum up debt in Usd
            if (borrowBalance != 0) {
                data.borrowAddr[borrowPos] = asset;
                (, data.borrowAmounts[borrowPos]) = mulScalarTruncate(oraclePrice, borrowBalance);
                borrowPos++;
            }
        }

        data.ratio = uint128(getSafetyRatio(_user));

        return data;
    }

    function getTokenBalances(address _user, address[] memory _cTokens) public view returns (uint[] memory balances, uint[] memory borrows) {
        balances = new uint[](_cTokens.length);
        borrows = new uint[](_cTokens.length);

        for (uint i = 0; i < _cTokens.length; i++) {
            address asset = _cTokens[i];

            (, uint cTokenBalance, uint borrowBalance, uint exchangeRateMantissa)
                                        = ICToken(asset).getAccountSnapshot(_user);

            Exp memory exchangeRate = Exp({mantissa: exchangeRateMantissa});
            (, balances[i]) = mulScalarTruncate(exchangeRate, cTokenBalance);

            borrows[i] = borrowBalance;
        }

    }

    /// @notice Fetches all the collateral/debt address and amounts, denominated in usd
    /// @param _users Addresses of the user
    /// @return loans Array of LoanData information
    function getLoanDataArr(address[] memory _users) public view returns (LoanData[] memory loans) {
        loans = new LoanData[](_users.length);

        for (uint i = 0; i < _users.length; ++i) {
            loans[i] = getLoanData(_users[i]);
        }
    }

    /// @notice Calculated the ratio of coll/debt for a compound user
    /// @param _users Addresses of the user
    /// @return ratios Array of ratios
    function getRatios(address[] memory _users) public view returns (uint[] memory ratios) {
        ratios = new uint[](_users.length);

        for (uint i = 0; i < _users.length; ++i) {
            ratios[i] = getSafetyRatio(_users[i]);
        }
    }

    /// @notice Information about cTokens
    /// @param _cTokenAddresses Array of cTokens addresses
    /// @return tokens Array of cTokens information
    function getTokensInfo(address[] memory _cTokenAddresses) public returns(TokenInfo[] memory tokens) {
        tokens = new TokenInfo[](_cTokenAddresses.length);
        address oracleAddr = Comptroller.oracle();

        for (uint i = 0; i < _cTokenAddresses.length; ++i) {
            (, uint collFactor) = Comptroller.markets(_cTokenAddresses[i]);

            tokens[i] = TokenInfo({
                cTokenAddress: _cTokenAddresses[i],
                underlyingTokenAddress: getUnderlyingAddr(_cTokenAddresses[i]),
                collateralFactor: collFactor,
                price: ICompoundOracle(oracleAddr).getUnderlyingPrice(_cTokenAddresses[i])
            });
        }
    }

    /// @notice Information about cTokens
    /// @param _cTokenAddresses Array of cTokens addresses
    /// @return tokens Array of cTokens information
    function getFullTokensInfo(address[] memory _cTokenAddresses) public returns(TokenInfoFull[] memory tokens) {
        tokens = new TokenInfoFull[](_cTokenAddresses.length);
        address oracleAddr = Comptroller.oracle();

        for (uint i = 0; i < _cTokenAddresses.length; ++i) {
            (, uint collFactor) = Comptroller.markets(_cTokenAddresses[i]);
            ICToken cToken = ICToken(_cTokenAddresses[i]);

            tokens[i] = TokenInfoFull({
                underlyingTokenAddress: getUnderlyingAddr(_cTokenAddresses[i]),
                supplyRate: cToken.supplyRatePerBlock(),
                borrowRate: cToken.borrowRatePerBlock(),
                exchangeRate: cToken.exchangeRateCurrent(),
                marketLiquidity: cToken.getCash(),
                totalSupply: cToken.totalSupply(),
                totalBorrow: cToken.totalBorrowsCurrent(),
                collateralFactor: collFactor,
                price: ICompoundOracle(oracleAddr).getUnderlyingPrice(_cTokenAddresses[i])
            });
        }
    }

    /// @notice Returns the underlying address of the cToken asset
    /// @param _cTokenAddress cToken address
    /// @return Token address of the cToken specified
    function getUnderlyingAddr(address _cTokenAddress) internal returns (address) {
        if (_cTokenAddress == CETH_ADDRESS) {
            return ETH_ADDRESS;
        } else {
            return ICToken(_cTokenAddress).underlying();
        }
    }

    function getSupplyBalance(address _cToken, address _supplier)
        public
        view
        returns (uint256 supplierAccrued)
    {
        IComptroller.CompMarketState memory supplyState = Comptroller.compSupplyState(_cToken);
        Double memory supplyIndex = Double({mantissa: supplyState.index});
        Double memory supplierIndex = Double({
            mantissa: Comptroller.compSupplierIndex(_cToken, _supplier)
        });

        if (supplierIndex.mantissa == 0 && supplyIndex.mantissa > 0) {
            supplierIndex.mantissa = compInitialIndex;
        }

        Double memory deltaIndex = sub_(supplyIndex, supplierIndex);
        uint256 supplierTokens = ICToken(_cToken).balanceOf(_supplier);
        uint256 supplierDelta = mul_(supplierTokens, deltaIndex);
        supplierAccrued = supplierDelta;
    }

    function getBorrowBalance(address _cToken, address _borrower)
        public
        view
        returns (uint256 borrowerAccrued)
    {
        IComptroller.CompMarketState memory borrowState = Comptroller.compBorrowState(_cToken);
        Double memory borrowIndex = Double({mantissa: borrowState.index});
        Double memory borrowerIndex = Double({
            mantissa: Comptroller.compBorrowerIndex(_cToken, _borrower)
        });

        Exp memory marketBorrowIndex = Exp({mantissa: ICToken(_cToken).borrowIndex()});

        if (borrowerIndex.mantissa > 0) {
            Double memory deltaIndex = sub_(borrowIndex, borrowerIndex);
            uint256 borrowerAmount = div_(
                ICToken(_cToken).borrowBalanceStored(_borrower),
                marketBorrowIndex
            );
            uint256 borrowerDelta = mul_(borrowerAmount, deltaIndex);
            borrowerAccrued = borrowerDelta;
        }
    }

    function getClaimableCompBalance(address _user, address[] memory _cTokens) public view returns (uint256) {
        uint256 compBalance = 0;

        for (uint256 i = 0; i < _cTokens.length; ++i) {
            compBalance += getSupplyBalance(_cTokens[i], _user);
            compBalance += getBorrowBalance(_cTokens[i], _user);
        }

        compBalance = add_(IComptroller(COMPTROLLER_ADDR).compAccrued(_user), compBalance);

        compBalance += IERC20(COMP_ADDR).balanceOf(_user);

        return compBalance;
    }
}