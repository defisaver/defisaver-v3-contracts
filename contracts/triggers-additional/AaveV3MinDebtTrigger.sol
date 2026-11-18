// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../auth/AdminAuth.sol";
import { ITrigger } from "../interfaces/core/ITrigger.sol";
import { IPoolV3 } from "../interfaces/protocols/aaveV3/IPoolV3.sol";
import { IPoolAddressesProvider } from "../interfaces/protocols/aaveV3/IPoolAddressesProvider.sol";
import { IAaveV3Oracle } from "../interfaces/protocols/aaveV3/IAaveV3Oracle.sol";
import { IERC20 } from "../interfaces/token/IERC20.sol";

/// @notice Checks minimum debt, excluding single-collateral, single-debt same-asset positions.
contract AaveV3MinDebtTrigger is ITrigger, AdminAuth {
    /// @param user address of the user whose position we check
    /// @param market aaveV3 market address
    /// @param minDebt minimum debt in whole USD (no decimals, e.g. 5000 for 5000 USD) that the user must have for the trigger to return true
    struct CalldataParams {
        address user;
        address market;
        uint256 minDebt;
    }

    /// @dev totalDebtUSD is denominated in USD with 8 decimals, so 1e8 == 1 USD.
    uint256 constant PRECISION = 1e8;

    /// @dev Aave packs positions into a 256-bit bitmap, 2 bits per reserve (collateral, borrow).
    ///      0x55..55 is ...01010101, so ANDing keeps only the borrow bits.
    uint256 constant BORROWING_MASK =
        0x5555555555555555555555555555555555555555555555555555555555555555;

    function isTriggered(bytes memory _calldata, bytes memory)
        external
        view
        override
        returns (bool)
    {
        CalldataParams memory params = parseCallInputs(_calldata);

        IPoolAddressesProvider market = IPoolAddressesProvider(params.market);
        IPoolV3 pool = IPoolV3(market.getPool());
        uint256 configuration = pool.getUserConfiguration(params.user).data;
        uint256 borrowing = configuration & BORROWING_MASK;

        // A single borrow bit and its matching collateral bit describe a same-asset position.
        if (
            borrowing != 0 && (borrowing & (borrowing - 1)) == 0
                && configuration == (borrowing | (borrowing << 1))
        ) return false;

        address oracle = market.getPriceOracle();
        uint256 totalDebtUSD;

        for (uint16 i = 0; borrowing != 0; i++) {
            if (borrowing & 1 != 0) {
                address reserve = pool.getReserveAddressById(i);
                address variableDebtToken = pool.getReserveVariableDebtToken(reserve);
                uint256 debt = IERC20(variableDebtToken).balanceOf(params.user);
                if (debt != 0) {
                    uint256 price = IAaveV3Oracle(oracle).getAssetPrice(reserve);
                    totalDebtUSD += (debt * price) / (10 ** IERC20(reserve).decimals());
                }
            }
            borrowing >>= 2;
        }

        return totalDebtUSD >= params.minDebt * PRECISION;
    }

    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) { }

    function isChangeable() public pure override returns (bool) {
        return false;
    }

    function parseCallInputs(bytes memory _callData)
        public
        pure
        returns (CalldataParams memory params)
    {
        params = abi.decode(_callData, (CalldataParams));
    }
}
