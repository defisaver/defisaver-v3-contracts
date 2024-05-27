// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IComet } from "../interfaces/compoundV3/IComet.sol";

// Utility functions taken from the CompoundV3 contracts
contract CompV3PortedFunctions {

    /// @dev The scale for factors
    uint64 internal constant FACTOR_SCALE = 1e18;

    /// @dev The scale for base index (depends on time/rate scales, not base token)
    uint64 internal constant BASE_INDEX_SCALE = 1e15;

    /**
     * @dev The change in principal broken into withdraw and borrow amounts
     */
    function withdrawAndBorrowAmount(int104 oldPrincipal, int104 newPrincipal) internal pure returns (uint104, uint104) {
        // If the new principal is greater than the old principal, then no amount has been withdrawn or borrowed
        if (newPrincipal > oldPrincipal) return (0, 0);

        if (newPrincipal >= 0) {
            return (uint104(oldPrincipal - newPrincipal), 0);
        } else if (oldPrincipal <= 0) {
            return (0, uint104(oldPrincipal - newPrincipal));
        } else {
            return (uint104(oldPrincipal), uint104(-newPrincipal));
        }
    }

    /**
     * @dev The change in principal broken into repay and supply amounts
     */
    function repayAndSupplyAmount(int104 oldPrincipal, int104 newPrincipal) internal pure returns (uint104, uint104) {
        // If the new principal is less than the old principal, then no amount has been repaid or supplied
        if (newPrincipal < oldPrincipal) return (0, 0);

        if (newPrincipal <= 0) {
            return (uint104(newPrincipal - oldPrincipal), 0);
        } else if (oldPrincipal >= 0) {
            return (0, uint104(newPrincipal - oldPrincipal));
        } else {
            return (uint104(-oldPrincipal), uint104(newPrincipal));
        }
    }

    /**
     * @dev The positive present supply balance if positive or the negative borrow balance if negative
     */
    function presentValue(int104 principalValue_, uint64 _baseSupplyIndex, uint64 _baseBorrowIndex) internal pure returns (int256) {
        if (principalValue_ >= 0) {
            return signed256(presentValueSupply(_baseSupplyIndex, uint104(principalValue_)));
        } else {
            return -signed256(presentValueBorrow(_baseBorrowIndex, uint104(-principalValue_)));
        }
    }

     /**
     * @dev The principal amount projected forward by the supply index
     */
    function presentValueSupply(uint64 baseSupplyIndex_, uint104 principalValue_) internal pure returns (uint256) {
        return uint256(principalValue_) * baseSupplyIndex_ / BASE_INDEX_SCALE;
    }

    /**
     * @dev The principal amount projected forward by the borrow index
     */
    function presentValueBorrow(uint64 baseBorrowIndex_, uint104 principalValue_) internal pure returns (uint256) {
        return uint256(principalValue_) * baseBorrowIndex_ / BASE_INDEX_SCALE;
    }

    /**
     * @dev The positive principal if positive or the negative principal if negative
     */
    function principalValue(int256 presentValue_, uint64 baseSupplyIndex_, uint64 baseBorrowIndex_) internal pure returns (int104) {
        if (presentValue_ >= 0) {
            return signed104(principalValueSupply(baseSupplyIndex_, uint256(presentValue_)));
        } else {
            return -signed104(principalValueBorrow(baseBorrowIndex_, uint256(-presentValue_)));
        }
    }

    /**
     * @dev The present value projected backward by the supply index (rounded down)
     *  Note: This will overflow (revert) at 2^104/1e18=~20 trillion principal for assets with 18 decimals.
     */
    function principalValueSupply(uint64 baseSupplyIndex_, uint256 presentValue_) internal pure returns (uint104) {
        return safe104((presentValue_ * BASE_INDEX_SCALE) / baseSupplyIndex_);
    }

    /**
     * @dev The present value projected backward by the borrow index (rounded up)
     *  Note: This will overflow (revert) at 2^104/1e18=~20 trillion principal for assets with 18 decimals.
     */
    function principalValueBorrow(uint64 baseBorrowIndex_, uint256 presentValue_) internal pure returns (uint104) {
        return safe104((presentValue_ * BASE_INDEX_SCALE + baseBorrowIndex_ - 1) / baseBorrowIndex_);
    }

    /**
     * @dev Note: Does not accrue interest first
     * @return The utilization rate of the base asset
     */
    function getUtilization(
        IComet.TotalsBasic memory totals
    ) public pure returns (uint) 
    {
        uint totalSupply_ = presentValueSupply(totals.baseSupplyIndex, totals.totalSupplyBase);
        uint totalBorrow_ = presentValueBorrow(totals.baseBorrowIndex, totals.totalBorrowBase);
        if (totalSupply_ == 0) {
            return 0;
        } else {
            return totalBorrow_ * FACTOR_SCALE / totalSupply_;
        }
    }

    /**
     * @dev Multiply a number by a factor
     */
    function mulFactor(uint n, uint factor) internal pure returns (uint) {
        return n * factor / FACTOR_SCALE;
    }

    function signed256(uint256 n) internal pure returns (int256) {
        if (n > uint256(type(int256).max)) revert("invalid int256");
        return int256(n);
    }

    function signed104(uint104 n) internal pure returns (int104) {
        if (n > uint104(type(int104).max)) revert("invalid int104");
        return int104(n);
    }

     function safe104(uint n) internal pure returns (uint104) {
        if (n > type(uint104).max) revert("invalid uint104");
        return uint104(n);
    }

    function safe64(uint n) internal pure returns (uint64) {
        if (n > type(uint64).max) revert("invalid uint64");
        return uint64(n);
    }
}