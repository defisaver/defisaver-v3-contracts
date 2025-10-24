// SPDX-License-Identifier: MIT

pragma solidity 0.8.24;

interface IFluidDexT1 {
    error FluidDexError(uint256 errorId);

    /// @notice used to simulate swap to find the output amount
    error FluidDexSwapResult(uint256 amountOut);

    error FluidDexPerfectLiquidityOutput(uint256 token0Amt, uint256 token1Amt);

    error FluidDexSingleTokenOutput(uint256 tokenAmt);

    error FluidDexLiquidityOutput(uint256 shares);

    error FluidDexPricesAndExchangeRates(PricesAndExchangePrice pex_);

    /// @notice returns the dex id
    function DEX_ID() external view returns (uint256);

    /// @notice reads uint256 data `result_` from storage at a bytes32 storage `slot_` key.
    function readFromStorage(bytes32 slot_) external view returns (uint256 result_);

    struct Implementations {
        address shift;
        address admin;
        address colOperations;
        address debtOperations;
        address perfectOperationsAndOracle;
    }

    struct ConstantViews {
        uint256 dexId;
        address liquidity;
        address factory;
        Implementations implementations;
        address deployerContract;
        address token0;
        address token1;
        bytes32 supplyToken0Slot;
        bytes32 borrowToken0Slot;
        bytes32 supplyToken1Slot;
        bytes32 borrowToken1Slot;
        bytes32 exchangePriceToken0Slot;
        bytes32 exchangePriceToken1Slot;
        uint256 oracleMapping;
    }

    struct ConstantViews2 {
        uint256 token0NumeratorPrecision;
        uint256 token0DenominatorPrecision;
        uint256 token1NumeratorPrecision;
        uint256 token1DenominatorPrecision;
    }

    struct PricesAndExchangePrice {
        uint256 lastStoredPrice; // last stored price in 1e27 decimals
        uint256 centerPrice; // last stored price in 1e27 decimals
        uint256 upperRange; // price at upper range in 1e27 decimals
        uint256 lowerRange; // price at lower range in 1e27 decimals
        uint256 geometricMean; // geometric mean of upper range & lower range in 1e27 decimals
        uint256 supplyToken0ExchangePrice;
        uint256 borrowToken0ExchangePrice;
        uint256 supplyToken1ExchangePrice;
        uint256 borrowToken1ExchangePrice;
    }

    struct CollateralReserves {
        uint256 token0RealReserves;
        uint256 token1RealReserves;
        uint256 token0ImaginaryReserves;
        uint256 token1ImaginaryReserves;
    }

    struct DebtReserves {
        uint256 token0Debt;
        uint256 token1Debt;
        uint256 token0RealReserves;
        uint256 token1RealReserves;
        uint256 token0ImaginaryReserves;
        uint256 token1ImaginaryReserves;
    }

    function getCollateralReserves(
        uint256 geometricMean_,
        uint256 upperRange_,
        uint256 lowerRange_,
        uint256 token0SupplyExchangePrice_,
        uint256 token1SupplyExchangePrice_
    ) external view returns (CollateralReserves memory c_);

    function getDebtReserves(
        uint256 geometricMean_,
        uint256 upperRange_,
        uint256 lowerRange_,
        uint256 token0BorrowExchangePrice_,
        uint256 token1BorrowExchangePrice_
    ) external view returns (DebtReserves memory d_);

    // reverts with FluidDexPricesAndExchangeRates(pex_);
    function getPricesAndExchangePrices() external;

    function constantsView() external view returns (ConstantViews memory constantsView_);

    function constantsView2() external view returns (ConstantViews2 memory constantsView2_);

    struct Oracle {
        uint256 twap1by0; // TWAP price
        uint256 lowestPrice1by0; // lowest price point
        uint256 highestPrice1by0; // highest price point
        uint256 twap0by1; // TWAP price
        uint256 lowestPrice0by1; // lowest price point
        uint256 highestPrice0by1; // highest price point
    }

    /// @dev This function allows users to swap a specific amount of input tokens for output tokens
    /// @param swap0to1_ Direction of swap. If true, swaps token0 for token1; if false, swaps token1 for token0
    /// @param amountIn_ The exact amount of input tokens to swap
    /// @param amountOutMin_ The minimum amount of output tokens the user is willing to accept
    /// @param to_ Recipient of swapped tokens. If to_ == address(0) then out tokens will be sent to msg.sender. If to_ == ADDRESS_DEAD then function will revert with amountOut_
    /// @return amountOut_ The amount of output tokens received from the swap
    function swapIn(bool swap0to1_, uint256 amountIn_, uint256 amountOutMin_, address to_)
        external
        payable
        returns (uint256 amountOut_);

    /// @dev Swap tokens with perfect amount out
    /// @param swap0to1_ Direction of swap. If true, swaps token0 for token1; if false, swaps token1 for token0
    /// @param amountOut_ The exact amount of tokens to receive after swap
    /// @param amountInMax_ Maximum amount of tokens to swap in
    /// @param to_ Recipient of swapped tokens. If to_ == address(0) then out tokens will be sent to msg.sender. If to_ == ADDRESS_DEAD then function will revert with amountIn_
    /// @return amountIn_ The amount of input tokens used for the swap
    function swapOut(bool swap0to1_, uint256 amountOut_, uint256 amountInMax_, address to_)
        external
        payable
        returns (uint256 amountIn_);

    /// @dev Deposit tokens in equal proportion to the current pool ratio
    /// @param shares_ The number of shares to mint
    /// @param maxToken0Deposit_ Maximum amount of token0 to deposit
    /// @param maxToken1Deposit_ Maximum amount of token1 to deposit
    /// @param estimate_ If true, function will revert with estimated deposit amounts without executing the deposit
    /// @return token0Amt_ Amount of token0 deposited
    /// @return token1Amt_ Amount of token1 deposited
    function depositPerfect(uint256 shares_, uint256 maxToken0Deposit_, uint256 maxToken1Deposit_, bool estimate_)
        external
        payable
        returns (uint256 token0Amt_, uint256 token1Amt_);

    /// @dev This function allows users to withdraw a perfect amount of collateral liquidity
    /// @param shares_ The number of shares to withdraw
    /// @param minToken0Withdraw_ The minimum amount of token0 the user is willing to accept
    /// @param minToken1Withdraw_ The minimum amount of token1 the user is willing to accept
    /// @param to_ Recipient of swapped tokens. If to_ == address(0) then out tokens will be sent to msg.sender. If to_ == ADDRESS_DEAD then function will revert with token0Amt_ & token1Amt_
    /// @return token0Amt_ The amount of token0 withdrawn
    /// @return token1Amt_ The amount of token1 withdrawn
    function withdrawPerfect(uint256 shares_, uint256 minToken0Withdraw_, uint256 minToken1Withdraw_, address to_)
        external
        returns (uint256 token0Amt_, uint256 token1Amt_);

    /// @dev This function allows users to borrow tokens in equal proportion to the current debt pool ratio
    /// @param shares_ The number of shares to borrow
    /// @param minToken0Borrow_ Minimum amount of token0 to borrow
    /// @param minToken1Borrow_ Minimum amount of token1 to borrow
    /// @param to_ Recipient of swapped tokens. If to_ == address(0) then out tokens will be sent to msg.sender. If to_ == ADDRESS_DEAD then function will revert with token0Amt_ & token1Amt_
    /// @return token0Amt_ Amount of token0 borrowed
    /// @return token1Amt_ Amount of token1 borrowed
    function borrowPerfect(uint256 shares_, uint256 minToken0Borrow_, uint256 minToken1Borrow_, address to_)
        external
        returns (uint256 token0Amt_, uint256 token1Amt_);

    /// @dev This function allows users to pay back borrowed tokens in equal proportion to the current debt pool ratio
    /// @param shares_ The number of shares to pay back
    /// @param maxToken0Payback_ Maximum amount of token0 to pay back
    /// @param maxToken1Payback_ Maximum amount of token1 to pay back
    /// @param estimate_ If true, function will revert with estimated payback amounts without executing the payback
    /// @return token0Amt_ Amount of token0 paid back
    /// @return token1Amt_ Amount of token1 paid back
    function paybackPerfect(uint256 shares_, uint256 maxToken0Payback_, uint256 maxToken1Payback_, bool estimate_)
        external
        payable
        returns (uint256 token0Amt_, uint256 token1Amt_);

    /// @dev This function allows users to deposit tokens in any proportion into the col pool
    /// @param token0Amt_ The amount of token0 to deposit
    /// @param token1Amt_ The amount of token1 to deposit
    /// @param minSharesAmt_ The minimum amount of shares the user expects to receive
    /// @param estimate_ If true, function will revert with estimated shares without executing the deposit
    /// @return shares_ The amount of shares minted for the deposit
    function deposit(uint256 token0Amt_, uint256 token1Amt_, uint256 minSharesAmt_, bool estimate_)
        external
        payable
        returns (uint256 shares_);

    /// @dev This function allows users to withdraw tokens in any proportion from the col pool
    /// @param token0Amt_ The amount of token0 to withdraw
    /// @param token1Amt_ The amount of token1 to withdraw
    /// @param maxSharesAmt_ The maximum number of shares the user is willing to burn
    /// @param to_ Recipient of swapped tokens. If to_ == address(0) then out tokens will be sent to msg.sender. If to_ == ADDRESS_DEAD then function will revert with shares_
    /// @return shares_ The number of shares burned for the withdrawal
    function withdraw(uint256 token0Amt_, uint256 token1Amt_, uint256 maxSharesAmt_, address to_)
        external
        returns (uint256 shares_);

    /// @dev This function allows users to borrow tokens in any proportion from the debt pool
    /// @param token0Amt_ The amount of token0 to borrow
    /// @param token1Amt_ The amount of token1 to borrow
    /// @param maxSharesAmt_ The maximum amount of shares the user is willing to receive
    /// @param to_ Recipient of swapped tokens. If to_ == address(0) then out tokens will be sent to msg.sender. If to_ == ADDRESS_DEAD then function will revert with shares_
    /// @return shares_ The amount of borrow shares minted to represent the borrowed amount
    function borrow(uint256 token0Amt_, uint256 token1Amt_, uint256 maxSharesAmt_, address to_)
        external
        returns (uint256 shares_);

    /// @dev This function allows users to payback tokens in any proportion to the debt pool
    /// @param token0Amt_ The amount of token0 to payback
    /// @param token1Amt_ The amount of token1 to payback
    /// @param minSharesAmt_ The minimum amount of shares the user expects to burn
    /// @param estimate_ If true, function will revert with estimated shares without executing the payback
    /// @return shares_ The amount of borrow shares burned for the payback
    function payback(uint256 token0Amt_, uint256 token1Amt_, uint256 minSharesAmt_, bool estimate_)
        external
        payable
        returns (uint256 shares_);

    /// @dev This function allows users to withdraw their collateral with perfect shares in one token
    /// @param shares_ The number of shares to burn for withdrawal
    /// @param minToken0_ The minimum amount of token0 the user expects to receive (set to 0 if withdrawing in token1)
    /// @param minToken1_ The minimum amount of token1 the user expects to receive (set to 0 if withdrawing in token0)
    /// @param to_ Recipient of swapped tokens. If to_ == address(0) then out tokens will be sent to msg.sender. If to_ == ADDRESS_DEAD then function will revert with withdrawAmt_
    /// @return withdrawAmt_ The amount of tokens withdrawn in the chosen token
    function withdrawPerfectInOneToken(uint256 shares_, uint256 minToken0_, uint256 minToken1_, address to_)
        external
        returns (uint256 withdrawAmt_);

    /// @dev This function allows users to payback their debt with perfect shares in one token
    /// @param shares_ The number of shares to burn for payback
    /// @param maxToken0_ The maximum amount of token0 the user is willing to pay (set to 0 if paying back in token1)
    /// @param maxToken1_ The maximum amount of token1 the user is willing to pay (set to 0 if paying back in token0)
    /// @param estimate_ If true, the function will revert with the estimated payback amount without executing the payback
    /// @return paybackAmt_ The amount of tokens paid back in the chosen token
    function paybackPerfectInOneToken(uint256 shares_, uint256 maxToken0_, uint256 maxToken1_, bool estimate_)
        external
        payable
        returns (uint256 paybackAmt_);

    /// @dev the oracle assumes last set price of pool till the next swap happens.
    /// There's a possibility that during that time some interest is generated hence the last stored price is not the 100% correct price for the whole duration
    /// but the difference due to interest will be super low so this difference is ignored
    /// For example 2 swaps happened 10min (600 seconds) apart and 1 token has 10% higher interest than other.
    /// then that token will accrue about 10% * 600 / secondsInAYear = ~0.0002%
    /// @param secondsAgos_ array of seconds ago for which TWAP is needed. If user sends [10, 30, 60] then twaps_ will return [10-0, 30-10, 60-30]
    /// @return twaps_ twap price, lowest price (aka minima) & highest price (aka maxima) between secondsAgo checkpoints
    /// @return currentPrice_ price of pool after the most recent swap
    function oraclePrice(uint256[] memory secondsAgos_)
        external
        view
        returns (Oracle[] memory twaps_, uint256 currentPrice_);
}
