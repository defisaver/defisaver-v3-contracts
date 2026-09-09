// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

int256 constant LN_ONE_PLUS_DELTA = 0.004987541511039073e18; // floor(ln(1.005) * 1e18)
uint256 constant MAX_TICK = 6744;
// Minimum representable price increment in WAD (1e-7 WAD). Tick prices are rounded to multiples of this value.
uint256 constant PRICE_ROUNDING_STEP = 1e11;

/// @dev Taken from: https://github.com/morpho-org/midnight
/// @dev Changes:
/// - `require(Error())` syntax changed to `revert Error()` to work with 0.8.24
library TickLib {
    using TickLib for uint256;

    error PriceGreaterThanOne();
    error TickOutOfRange();

    /// @dev Returns x / d rounded to the nearest integer with ties rounded down, without checking for overflow.
    function divHalfDownUnchecked(uint256 x, uint256 d) internal pure returns (uint256) {
        unchecked {
            return (x + (d - 1) / 2) / d;
        }
    }

    function wExp(int256 x) internal pure returns (uint256) {
        unchecked {
            if (x < 0) {
                return 1e36 / wExp(-x);
            } else {
                int256 ln2 = 0.693147180559945309e18; // floor(ln(2) * 1e18)
                // offset is chosen such that 2 * expR(-offset) == expR(ln2 - offset - 1), so wExp is non-decreasing.
                int256 offset = 0.32261121498945987e18;
                int256 q = (x + offset) / ln2;
                int256 r = x - q * ln2;
                int256 secondTerm = r * r / (2 * 1e18);
                int256 thirdTerm = secondTerm * r / (3 * 1e18);
                int256 expR = 1e18 + r + secondTerm + thirdTerm;
                // forge-lint: disable-next-item(unsafe-typecast)
                // - q is non-negative because x is non-negative in this branch
                // - expR is positive because |r| < ln2 < 1e18 and |secondTerm| > |thirdTerm|
                return uint256(expR) << uint256(q);
            }
        }
    }

    function tickToPrice(uint256 tick) internal pure returns (uint256) {
        if (tick > MAX_TICK) revert TickOutOfRange();
        unchecked {
            // forge-lint: disable-next-item(unsafe-typecast)
            return uint256(1e36)
                    .divHalfDownUnchecked(
                    1e18 + wExp(LN_ONE_PLUS_DELTA * (int256(MAX_TICK / 2) - int256(tick)))
                ).divHalfDownUnchecked(PRICE_ROUNDING_STEP) * PRICE_ROUNDING_STEP;
        }
    }

    /// @dev Among the ticks that are multiples of spacing, returns the lowest one with a price higher or equal.
    /// @dev spacing should divide MAX_TICK.
    function priceToTick(uint256 price, uint256 spacing) internal pure returns (uint256) {
        if (price > 1e18) revert PriceGreaterThanOne();
        uint256 low = 0;
        uint256 high = MAX_TICK;
        while (low != high) {
            unchecked {
                uint256 mid = (low + high) / 2;
                if (tickToPrice(mid) < price) low = mid + 1;
                else high = mid;
            }
        }
        return (low + spacing - 1) / spacing * spacing;
    }
}
