// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

interface IStaticATokenV2 {
    struct SignatureParams {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    /**
    * @notice Burns `shares` of static aToken, with receiver receiving the corresponding amount of aToken
    * @param shares The shares to withdraw, in static balance of StaticAToken
    * @param receiver The address that will receive the amount of `ASSET` withdrawn from the Aave protocol
    * @return amountToWithdraw: aToken send to `receiver`, dynamic balance
    **/
    function redeemATokens(
        uint256 shares,
        address receiver,
        address owner
    ) external returns (uint256);

    /**
    * @notice Deposits aTokens and mints static aTokens to msg.sender
    * @param assets The amount of aTokens to deposit (e.g. deposit of 100 aUSDC)
    * @param receiver The address that will receive the static aTokens
    * @return uint256 The amount of StaticAToken minted, static balance
    **/
    function depositATokens(uint256 assets, address receiver) external returns (uint256);

        /**
    * @notice Universal deposit method for proving aToken or underlying liquidity with permit
    * @param assets The amount of aTokens or underlying to deposit
    * @param receiver The address that will receive the static aTokens
    * @param deadline Must be a timestamp in the future
    * @param sig A `secp256k1` signature params from `msgSender()`
    * @return uint256 The amount of StaticAToken minted, static balance
    **/
    function depositWithPermit(
        uint256 assets,
        address receiver,
        uint256 deadline,
        SignatureParams memory sig,
        bool depositToAave
    ) external returns (uint256);

    /**
    * @notice The aToken used inside the 4626 vault.
    * @return address The aToken address.
    */
    function aToken() external view returns (address);

    /**
    * @notice Returns the current asset price of the stataToken.
    * The price is calculated as `underlying_price * exchangeRate`.
    * It is important to note that:
    * - `underlying_price` is the price obtained by the aave-oracle and is subject to it's internal pricing mechanisms.
    * - as the price is scaled over the exchangeRate, but maintains the same precision as the underlying the price might be underestimated by 1 unit.
    * - when pricing multiple `shares` as `shares * price` keep in mind that the error compounds.
    * @return price the current asset price.
    */
    function latestAnswer() external view returns (int256);
}