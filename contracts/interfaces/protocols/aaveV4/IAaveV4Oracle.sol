// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

/// @title IPriceOracle
/// @author Aave Labs
/// @notice Basic interface for any price oracle.
/// @dev All prices must use the same number of decimals as the oracle and should be returned in the same currency.
/// @dev This interface is modified by DFS to bundle all methods into single interface and remove unused stuff.
interface IAaveV4Oracle {
    /// @notice Returns the address of the spoke.
    /// @return The address of the spoke.
    function SPOKE() external view returns (address);

    /// @notice Returns the number of decimals used to return prices.
    /// @return The number of decimals.
    function DECIMALS() external view returns (uint8);

    /// @notice Returns the reserve price with `decimals` precision.
    /// @param reserveId The identifier of the reserve.
    /// @return The price of the reserve.
    function getReservePrice(uint256 reserveId) external view returns (uint256);

    /// @notice Returns the prices of multiple reserves.
    /// @param reserveIds The identifiers of the reserves.
    /// @return prices The prices of the reserves.
    function getReservesPrices(uint256[] calldata reserveIds)
        external
        view
        returns (uint256[] memory);

    /// @notice Returns the price feed source of a reserve.
    /// @param reserveId The identifier of the reserve.
    /// @return source The price feed source of the reserve.
    function getReserveSource(uint256 reserveId) external view returns (address);

    /// @notice Returns the description of the oracle.
    /// @return The description of the oracle.
    function DESCRIPTION() external view returns (string memory);
}
