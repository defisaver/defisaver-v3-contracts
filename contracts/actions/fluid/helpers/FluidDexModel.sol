// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVaultResolver } from "../../../interfaces/fluid/resolvers/IFluidVaultResolver.sol";

/// @title Helper library containing data structs used for interaction with Fluid DEX
library FluidDexModel {

    /// @param collAmount0 Amount of collateral 0 to deposit.
    /// @param collAmount1 Amount of collateral 1 to deposit.
    /// @param minCollShares Min amount of collateral shares to mint.
    struct SupplyVariableData {
        uint256 collAmount0;
        uint256 collAmount1;
        uint256 minCollShares;
    }

    /// @param collAmount0 Amount of collateral 0 to withdraw.
    /// @param collAmount1 Amount of collateral 1 to withdraw.
    /// @param maxCollShares Max amount of collateral shares to burn.
    struct WithdrawVariableData {
        uint256 collAmount0;
        uint256 collAmount1;
        uint256 maxCollShares;
    }

    /// @param debtAmount0 Amount of debt token 0 to borrow.
    /// @param debtAmount1 Amount of debt token 1 to borrow.
    /// @param minDebtShares Min amount of debt shares to mint.
    struct BorrowVariableData {
        uint256 debtAmount0;
        uint256 debtAmount1;
        uint256 minDebtShares;
    }

    /// @param debtAmount0 Amount of debt token 0 to payback.
    /// @param debtAmount1 Amount of debt token 1 to payback.
    /// @param maxDebtShares Max amount of debt shares to burn.
    struct PaybackVariableData {
        uint256 debtAmount0;
        uint256 debtAmount1;
        uint256 maxDebtShares;
    }

    /// @notice Data struct for supplying liquidity to a Fluid DEX
    /// @param vault Address of the vault
    /// @param vaultType Type of the vault. For supply, it will be T2 or T4
    /// @param nftId NFT id of the position
    /// @param from Address to pull the tokens from
    /// @param variableData Data for supplying liquidity with variable amounts
    struct SupplyDexData {
        address vault;
        uint256 vaultType;
        uint256 nftId;
        address from;
        SupplyVariableData variableData;
    }

    /// @notice Data struct for withdrawing liquidity from a Fluid DEX
    /// @param vault Address of the vault
    /// @param vaultType Type of the vault. For withdraw, it will be T2 or T4
    /// @param nftId NFT id of the position
    /// @param to Address to send the tokens to
    /// @param variableData Data for withdrawing liquidity with variable amounts
    /// @param wrapWithdrawnEth Whether to wrap withdrawn ETH into WETH
    struct WithdrawDexData {
        address vault;
        uint256 vaultType;
        uint256 nftId;
        address to;
        WithdrawVariableData variableData;
        bool wrapWithdrawnEth;
    }

    /// @notice Data struct for borrowing tokens from a Fluid DEX
    /// @param vault Address of the vault
    /// @param vaultType Type of the vault. For borrow, it will be T3 or T4
    /// @param nftId NFT id of the position
    /// @param to Address to send the borrowed tokens to
    /// @param variableData Data for borrowing tokens with variable amounts
    /// @param wrapBorrowedEth Whether to wrap borrowed ETH into WETH
    struct BorrowDexData {
        address vault;
        uint256 vaultType;
        uint256 nftId;
        address to;
        BorrowVariableData variableData;
        bool wrapBorrowedEth;
    }

    /// @notice Data struct for paying back borrowed tokens to a Fluid DEX
    /// @param vault Address of the vault
    /// @param vaultType Type of the vault. For payback, it will be T3 or T4
    /// @param nftId NFT id of the position
    /// @param from Address to pull the tokens from
    /// @param variableData Data for paying back borrowed tokens with variable amounts
    /// @param position User position data fetched from Fluid Vault Resolver
    struct PaybackDexData {
        address vault;
        uint256 vaultType;
        uint256 nftId;
        address from;
        PaybackVariableData variableData;
        IFluidVaultResolver.UserPosition position;
    }
}