// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { InterestRateModel } from "../interfaces/compound/InterestRateModel.sol";
import { DSMath } from "../DS/DSMath.sol";
import { Exponential } from "../utils/math/Exponential.sol";
import { IComptroller } from "../interfaces/compound/IComptroller.sol";
import { ICToken } from "../interfaces/compound/ICToken.sol";
import { ICompoundOracle } from "../interfaces/compound/ICompoundOracle.sol";

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
        uint compBorrowSpeeds;
        uint compSupplySpeeds;
        uint borrowCap;
        bool canMint;
        bool canBorrow;
    }

    /// @notice Params for supply and borrow rates estimation
    /// @param cTokenAddr Address of the cToken
    /// @param isBorrowOperation If the operation is borrow/repay, otherwise supply/withdraw
    /// @param liquidityAdded Amount of liquidity added (supply/repay)
    /// @param liquidityTaken Amount of liquidity taken (borrow/withdraw)
    struct LiquidityChangeParams {
        address cTokenAddr;
        bool isBorrowOperation;
        uint256 liquidityAdded;
        uint256 liquidityTaken;
    }
    
    struct EstimatedRates {
        address cTokenAddr;
        uint256 supplyRate;
        uint256 borrowRate;
    }

    address public constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant CETH_ADDRESS = 0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5;

    IComptroller public constant comp = IComptroller(0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B);

    function getSafetyRatio(address _user) public view returns (uint) {
        // For each asset the account is in
        address[] memory assets = comp.getAssetsIn(_user);
        address oracleAddr = comp.oracle();


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

                (, uint collFactorMantissa) = comp.markets(address(asset));

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

        if (sumBorrow == 0) return type(uint256).max;

        uint borrowPowerUsed = (sumBorrow * 10**18) / sumCollateral;
        return wdiv(1e18, borrowPowerUsed);
    }


    /// @notice Calcualted the ratio of coll/debt for a compound user
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
        address oracleAddr = comp.oracle();

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
            (, collFactors[i]) = comp.markets(_cTokens[i]);
        }
    }

    /// @notice Fetches all the collateral/debt address and amounts, denominated in usd
    /// @param _user Address of the user
    /// @return data LoanData information
    function getLoanData(address _user) public view returns (LoanData memory data) {
        address[] memory assets = comp.getAssetsIn(_user);
        address oracleAddr = comp.oracle();

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

    /// @notice Calcualted the ratio of coll/debt for a compound user
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
    /// @return tokens Array of cTokens infomartion
    function getTokensInfo(address[] memory _cTokenAddresses) public returns(TokenInfo[] memory tokens) {
        tokens = new TokenInfo[](_cTokenAddresses.length);
        address oracleAddr = comp.oracle();

        for (uint i = 0; i < _cTokenAddresses.length; ++i) {
            (, uint collFactor) = comp.markets(_cTokenAddresses[i]);

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
    /// @return tokens Array of cTokens infomartion
    function getFullTokensInfo(address[] memory _cTokenAddresses) public returns(TokenInfoFull[] memory tokens) {
        tokens = new TokenInfoFull[](_cTokenAddresses.length);
        address oracleAddr = comp.oracle();

        for (uint i = 0; i < _cTokenAddresses.length; ++i) {
            (, uint collFactor) = comp.markets(_cTokenAddresses[i]);
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
                price: ICompoundOracle(oracleAddr).getUnderlyingPrice(_cTokenAddresses[i]),
                compSupplySpeeds: comp.compSupplySpeeds(_cTokenAddresses[i]),
                compBorrowSpeeds: comp.compBorrowSpeeds(_cTokenAddresses[i]),
                borrowCap: comp.borrowCaps(_cTokenAddresses[i]),
                canMint: !comp.mintGuardianPaused(_cTokenAddresses[i]),
                canBorrow: !comp.borrowGuardianPaused(_cTokenAddresses[i])
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

    function getApyAfterValuesEstimation(LiquidityChangeParams[] memory _params) public returns (EstimatedRates[] memory retVal)
    {   
        retVal = new EstimatedRates[](_params.length);

        for (uint256 i = 0; i < _params.length; ++i) {
            ICToken cToken = ICToken(_params[i].cTokenAddr);
            InterestRateModel interestRateModel = cToken.interestRateModel();
    
            cToken.accrueInterest();

            uint256 totalBorrowsCurrent = cToken.totalBorrowsCurrent();
            uint256 totalUnderlying = cToken.getCash();
            uint256 totalReserves = cToken.totalReserves();

            totalUnderlying += _params[i].liquidityAdded;
            if (_params[i].liquidityTaken >= totalUnderlying) {
                totalUnderlying = 0;
            } else {
                totalUnderlying -= _params[i].liquidityTaken;
            }

            if (_params[i].isBorrowOperation) {
                totalBorrowsCurrent += _params[i].liquidityTaken;

                if (_params[i].liquidityAdded >= totalBorrowsCurrent) {
                    totalBorrowsCurrent = 0;
                } else {    
                    totalBorrowsCurrent -= _params[i].liquidityAdded;
                }
            }

            uint256 estimatedSupplyRate = _getEstimatedSupplyRate(
                address(interestRateModel),
                cToken.supplyRatePerBlock(),
                totalUnderlying,
                totalBorrowsCurrent,
                totalReserves,
                cToken.reserveFactorMantissa()
            );
            
            uint256 estimatedBorrowRate = _getEstimatedBorrowRate(
                address(interestRateModel),
                cToken.borrowRatePerBlock(),
                totalUnderlying,
                totalBorrowsCurrent,
                totalReserves
            );

            retVal[i] = EstimatedRates({
                cTokenAddr: _params[i].cTokenAddr,
                supplyRate: estimatedSupplyRate,
                borrowRate: estimatedBorrowRate
            });
        }
    }
    
    function _getEstimatedSupplyRate(
        address _interestRateModel,
        uint256 _currSupplyRate,
        uint256 _underlying,
        uint256 _borrows,
        uint256 _reserves,
        uint256 _reserveFactor
    ) internal view returns (uint256 supplyRate) {
        supplyRate = _currSupplyRate;

        (bool success, bytes memory data) = _interestRateModel.staticcall(
            abi.encodeWithSelector(
                InterestRateModel.getSupplyRate.selector,
                _underlying,
                _borrows,
                _reserves,
                _reserveFactor
            )
        );
        
        if (!success || data.length == 0) return supplyRate;

        if (data.length == 32) {
            supplyRate = abi.decode(data, (uint256));
        } else if (data.length == 64) {
            // In older implementations, two values are returned, with second one being the actual rate
            (, supplyRate) = abi.decode(data, (uint256, uint256));
        }
    }

    function _getEstimatedBorrowRate(
        address _interestRateModel,
        uint256 _currBorrowRate,
        uint256 _underlying,
        uint256 _borrows,
        uint256 _reserves
    ) internal view returns (uint256 borrowRate) {
        borrowRate = _currBorrowRate;

        (bool success, bytes memory data) = _interestRateModel.staticcall(
            abi.encodeWithSelector(
                InterestRateModel.getBorrowRate.selector,
                _underlying,
                _borrows,
                _reserves
            )
        );
        
        if (!success || data.length == 0) return borrowRate;

        if (data.length == 32) {
            borrowRate = abi.decode(data, (uint256));
        } else if (data.length == 64) {
            // In older implementations, two values are returned, with second one being the actual rate
            (, borrowRate) = abi.decode(data, (uint256, uint256));
        }
    }
}