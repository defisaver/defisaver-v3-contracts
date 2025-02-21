// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVaultResolver } from "../../../interfaces/fluid/IFluidVaultResolver.sol";

library FluidLiquidityModel {

    struct SupplyData {
        address vault;
        uint256 vaultType;
        uint256 nftId;
        address supplyToken;
        uint256 amount;
        address from;
        uint256 debtAmount;
        address debtTo;
    }

    struct WithdrawData {
        address vault;
        uint256 vaultType;
        uint256 nftId;
        address supplyToken;
        uint256 amount;
        address to;
        bool wrapWithdrawnEth;
    }

    struct BorrowData {
        address vault;
        uint256 vaultType;
        uint256 nftId;
        address borrowToken;
        uint256 amount;
        address to;
        bool wrapBorrowedEth;
    }

    struct PaybackData {
        address vault;
        uint256 vaultType;
        uint256 nftId;
        address borrowToken;
        uint256 amount;
        address from;
        IFluidVaultResolver.UserPosition position;
    }
}