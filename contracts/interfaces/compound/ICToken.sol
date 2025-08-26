// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { InterestRateModel } from "./InterestRateModel.sol";
import { IERC20 } from "../IERC20.sol";

abstract contract ICToken is IERC20 {
    function mint(uint256 mintAmount) external virtual returns (uint256);
    function mint() external payable virtual;

    function accrueInterest() public virtual returns (uint256);

    function redeem(uint256 redeemTokens) external virtual returns (uint256);

    function redeemUnderlying(uint256 redeemAmount) external virtual returns (uint256);

    function borrow(uint256 borrowAmount) external virtual returns (uint256);
    function borrowIndex() public view virtual returns (uint256);
    function borrowBalanceStored(address) public view virtual returns (uint256);

    function repayBorrow(uint256 repayAmount) external virtual returns (uint256);

    function repayBorrow() external payable virtual;

    function repayBorrowBehalf(address borrower, uint256 repayAmount) external virtual returns (uint256);

    function repayBorrowBehalf(address borrower) external payable virtual;

    function liquidateBorrow(address borrower, uint256 repayAmount, address cTokenCollateral)
        external
        virtual
        returns (uint256);

    function liquidateBorrow(address borrower, address cTokenCollateral) external payable virtual;

    function exchangeRateCurrent() external virtual returns (uint256);

    function supplyRatePerBlock() external virtual returns (uint256);

    function borrowRatePerBlock() external virtual returns (uint256);

    function totalReserves() external virtual returns (uint256);

    function reserveFactorMantissa() external virtual returns (uint256);

    function borrowBalanceCurrent(address account) external virtual returns (uint256);

    function totalBorrowsCurrent() external virtual returns (uint256);

    function getCash() external virtual returns (uint256);

    function balanceOfUnderlying(address owner) external virtual returns (uint256);

    function underlying() external virtual returns (address);

    function getAccountSnapshot(address account) external view virtual returns (uint256, uint256, uint256, uint256);

    function interestRateModel() external virtual returns (InterestRateModel);
}
