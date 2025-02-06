// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity =0.8.24;

interface IFluidVaultT2 {

    struct Tokens {
        address token0;
        address token1;
    }

    struct ConstantViews {
        address liquidity;
        address factory;
        address operateImplementation;
        address adminImplementation;
        address secondaryImplementation;
        address deployer; // address which deploys oracle
        address supply; // either liquidity layer or DEX protocol
        address borrow; // either liquidity layer or DEX protocol
        Tokens supplyToken; // if smart collateral then address of token0 & token1 else just supply token address at token0 and token1 as empty
        Tokens borrowToken; // if smart debt then address of token0 & token1 else just borrow token address at token0 and token1 as empty
        uint256 vaultId;
        uint256 vaultType;
        bytes32 supplyExchangePriceSlot; // if smart collateral then slot is from DEX protocol else from liquidity layer
        bytes32 borrowExchangePriceSlot; // if smart debt then slot is from DEX protocol else from liquidity layer
        bytes32 userSupplySlot; // if smart collateral then slot is from DEX protocol else from liquidity layer
        bytes32 userBorrowSlot; // if smart debt then slot is from DEX protocol else from liquidity layer
    }

    /// @notice Performs operations on a vault position
    /// @dev This function allows users to modify their vault position by adjusting collateral and debt
    /// @param nftId_ The ID of the NFT representing the vault position
    /// @param newColToken0_ The change in collateral amount of token0 (positive for deposit, negative for withdrawal)
    /// @param newColToken1_ The change in collateral amount of token1 (positive for deposit, negative for withdrawal)
    /// @param colSharesMinMax_ min or max collateral shares to mint or burn (positive for deposit, negative for withdrawal)
    /// @param newDebt_ The change in debt amount (positive for borrowing, negative for repayment)
    /// @param to_ The address to receive withdrawn collateral or borrowed tokens (if address(0), defaults to msg.sender)
    /// @return nftId_ The ID of the NFT representing the updated vault position
    /// @return supplyAmt_ Final supply amount (negative if withdrawal occurred)
    /// @return borrowAmt_ Final borrow amount (negative if repayment occurred)
    function operate(
        uint nftId_,
        int newColToken0_,
        int newColToken1_,
        int colSharesMinMax_,
        int newDebt_,
        address to_
    )
        external
        payable
        returns (
            uint256, // nftId_
            int256, // final supply amount. if - then withdraw
            int256 // final borrow amount. if - then payback
        );

    /// @notice Performs operations on a vault position with perfect collateral shares
    /// @dev This function allows users to modify their vault position by adjusting collateral and debt
    /// @param nftId_ The ID of the NFT representing the vault position
    /// @param perfectColShares_ The change in collateral shares (positive for deposit, negative for withdrawal)
    /// @param colToken0MinMax_ min or max collateral amount of token0 to withdraw or deposit (positive for deposit, negative for withdrawal)
    /// @param colToken1MinMax_ min or max collateral amount of token1 to withdraw or deposit (positive for deposit, negative for withdrawal)
    /// @param newDebt_ The change in debt amount (positive for borrowing, negative for repayment)
    /// @param to_ The address to receive withdrawn collateral or borrowed tokens (if address(0), defaults to msg.sender)
    /// @return nftId_ The ID of the NFT representing the updated vault position
    /// @return r_ int256 array of return values:
    ///              0 - final col shares amount (can only change on max withdrawal)
    ///              1 - token0 deposit or withdraw amount
    ///              2 - token1 deposit or withdraw amount
    ///              3 - newDebt_ will only change if user sent type(int).min
    function operatePerfect(
        uint nftId_,
        int perfectColShares_,
        int colToken0MinMax_,
        int colToken1MinMax_,
        int newDebt_,
        address to_
    )
        external
        payable
        returns (
            uint256, // nftId_
            int256[] memory r_
        );

    // @notice returns all Vault constants
    function constantsView() external view returns (ConstantViews memory constantsView_);
}