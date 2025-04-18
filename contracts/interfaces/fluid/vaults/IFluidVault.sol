// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity =0.8.24;

interface IFluidVault {

    /// @notice emitted when an operate() method is executed that changes collateral (`colAmt_`) / debt (debtAmt_`)
    /// amount for a `user_` position with `nftId_`. Receiver of any funds is the address `to_`.
    event LogOperate(address user_, uint256 nftId_, int256 colAmt_, int256 debtAmt_, address to_);

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

    // @notice returns all Vault constants
    function constantsView() external view returns (ConstantViews memory constantsView_);
}