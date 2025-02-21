// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVaultResolver } from "../../../interfaces/fluid/IFluidVaultResolver.sol";

library FluidDexModel {

    enum ActionType {
        LIQUIDITY,
        VARIABLE_DEX,
        EXACT_DEX
    }

    /// @param collAmount0 Amount of collateral 0 to deposit.
    /// @param collAmount1 Amount of collateral 1 to deposit.
    /// @param minCollShares Min amount of collateral shares to mint.
    struct SupplyVariableData {
        uint256 collAmount0;
        uint256 collAmount1;
        uint256 minCollShares;
    }

    /// @param perfectCollShares Exact amount of shares to mint.
    /// @param maxCollAmount0 Max amount of collateral 0 to deposit.
    /// @param maxCollAmount1 Max amount of collateral 1 to deposit.
    struct SupplyExactData {
        uint256 perfectCollShares;
        uint256 maxCollAmount0;
        uint256 maxCollAmount1;
    }

    /// @param collAmount0 Amount of collateral 0 to withdraw.
    /// @param collAmount1 Amount of collateral 1 to withdraw.
    /// @param maxCollShares Max amount of collateral shares to burn.
    struct WithdrawVariableData {
        uint256 collAmount0;
        uint256 collAmount1;
        uint256 maxCollShares;
    }

    /// @param perfectCollShares Exact amount of shares to burn.
    /// @param minCollAmount0 Min amount of collateral 0 to withdraw.
    /// @param minCollAmount1 Min amount of collateral 1 to withdraw.
    struct WithdrawExactData {
        uint256 perfectCollShares;
        uint256 minCollAmount0;
        uint256 minCollAmount1;
    }

    /// @param debtAmount0 Amount of debt token 0 to borrow.
    /// @param debtAmount1 Amount of debt token 1 to borrow.
    /// @param minDebtShares Min amount of debt shares to mint.
    struct BorrowVariableData {
        uint256 debtAmount0;
        uint256 debtAmount1;
        uint256 minDebtShares;
    }

    /// @param perfectDebtShares Exact amount of debt shares to mint.
    /// @param minDebtAmount0 Min amount of debt token 0 to borrow.
    /// @param minDebtAmount1 Min amount of debt token 1 to borrow.
    struct BorrowExactData {
        uint256 perfectDebtShares;
        uint256 minDebtAmount0;
        uint256 minDebtAmount1;
    }

    /// @param debtAmount0 Amount of debt token 0 to payback.
    /// @param debtAmount1 Amount of debt token 1 to payback.
    /// @param maxDebtShares Max amount of debt shares to burn.
    struct PaybackVariableData {
        uint256 debtAmount0;
        uint256 debtAmount1;
        uint256 maxDebtShares;
    }

    /// @param perfectDebtShares Exact amount of debt shares to burn.
    /// @param maxDebtAmount0 Max amount of debt token 0 to payback.
    /// @param maxDebtAmount1 Max amount of debt token 1 to payback.
    struct PaybackExactData {
        uint256 perfectDebtShares;
        uint256 maxDebtAmount0;
        uint256 maxDebtAmount1;
    }

    struct BorrowDexData {
        address vault;
        uint256 vaultType;
        uint256 nftId;
        address to;
        BorrowVariableData variableData;
        BorrowExactData exactData;
        bool wrapBorrowedEth;
    }

    struct PaybackDexData {
        address vault;
        uint256 vaultType;
        uint256 nftId;
        address from;
        PaybackVariableData variableData;
        PaybackExactData exactData;
        IFluidVaultResolver.UserPosition position;
    }

    struct SupplyDexData {
        address vault;
        uint256 vaultType;
        uint256 nftId;
        address from;
        SupplyVariableData variableData;
        SupplyExactData exactData;
    }

    struct WithdrawDexData {
        address vault;
        uint256 vaultType;
        uint256 nftId;
        address to;
        WithdrawVariableData variableData;
        WithdrawExactData exactData;
        bool wrapWithdrawnEth;
    }
}