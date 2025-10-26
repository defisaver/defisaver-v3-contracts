// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { InterestRateModel } from "./InterestRateModel.sol";
import { IERC20 } from "../../token/IERC20.sol";

interface ICToken is IERC20 {
    function mint(uint256 mintAmount) external returns (uint256);
    function mint() external payable;
    function accrueInterest() external returns (uint256);
    function redeem(uint256 redeemTokens) external returns (uint256);
    function redeemUnderlying(uint256 redeemAmount) external returns (uint256);
    function borrow(uint256 borrowAmount) external returns (uint256);
    function borrowIndex() external view returns (uint256);
    function borrowBalanceStored(address) external view returns (uint256);
    function repayBorrow(uint256 repayAmount) external returns (uint256);
    function repayBorrow() external payable;
    function repayBorrowBehalf(address borrower, uint256 repayAmount) external returns (uint256);
    function repayBorrowBehalf(address borrower) external payable;
    function liquidateBorrow(address borrower, uint256 repayAmount, address cTokenCollateral) external returns (uint256);
    function liquidateBorrow(address borrower, address cTokenCollateral) external payable;
    function exchangeRateCurrent() external returns (uint256);
    function supplyRatePerBlock() external returns (uint256);
    function borrowRatePerBlock() external returns (uint256);
    function totalReserves() external returns (uint256);
    function reserveFactorMantissa() external returns (uint256);
    function borrowBalanceCurrent(address account) external returns (uint256);
    function totalBorrowsCurrent() external returns (uint256);
    function getCash() external returns (uint256);
    function balanceOfUnderlying(address owner) external returns (uint256);
    function underlying() external returns (address);
    function getAccountSnapshot(address account) external view returns (uint256, uint256, uint256, uint256);
    function interestRateModel() external returns (InterestRateModel);
}
