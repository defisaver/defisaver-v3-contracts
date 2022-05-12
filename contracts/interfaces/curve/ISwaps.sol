// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;
pragma experimental ABIEncoderV2;

interface ISwaps {

    ///@notice Perform an exchange using the pool that offers the best rate
    ///@dev Prior to calling this function, the caller must approve
    ///        this contract to transfer `_amount` coins from `_from`
    ///        Does NOT check rates in factory-deployed pools
    ///@param _from Address of coin being sent
    ///@param _to Address of coin being received
    ///@param _amount Quantity of `_from` being sent
    ///@param _expected Minimum quantity of `_from` received
    ///        in order for the transaction to succeed
    ///@param _receiver Address to transfer the received tokens to
    ///@return uint256 Amount received
    function exchange_with_best_rate(
        address _from,
        address _to,
        uint256 _amount,
        uint256 _expected,
        address _receiver
    ) external payable returns (uint256);


    ///@notice Perform an exchange using a specific pool
    ///@dev Prior to calling this function, the caller must approve
    ///        this contract to transfer `_amount` coins from `_from`
    ///        Works for both regular and factory-deployed pools
    ///@param _pool Address of the pool to use for the swap
    ///@param _from Address of coin being sent
    ///@param _to Address of coin being received
    ///@param _amount Quantity of `_from` being sent
    ///@param _expected Minimum quantity of `_from` received
    ///        in order for the transaction to succeed
    ///@param _receiver Address to transfer the received tokens to
    ///@return uint256 Amount received
    function exchange(
        address _pool,
        address _from,
        address _to,
        uint256 _amount,
        uint256 _expected,
        address _receiver
    ) external payable returns (uint256);



    ///@notice Find the pool offering the best rate for a given swap.
    ///@dev Checks rates for regular and factory pools
    ///@param _from Address of coin being sent
    ///@param _to Address of coin being received
    ///@param _amount Quantity of `_from` being sent
    ///@param _exclude_pools A list of up to 8 addresses which shouldn't be returned
    ///@return Pool address, amount received
    function get_best_rate(
        address _from,
        address _to,
        uint256 _amount,
        address[8] memory _exclude_pools
    ) external view returns (address, uint256);


    ///@notice Get the current number of coins received in an exchange
    ///@dev Works for both regular and factory-deployed pools
    ///@param _pool Pool address
    ///@param _from Address of coin to be sent
    ///@param _to Address of coin to be received
    ///@param _amount Quantity of `_from` to be sent
    ///@return Quantity of `_to` to be received
    function get_exchange_amount(
        address _pool,
        address _from,
        address _to,
        uint256 _amount
    ) external view returns (uint256);


    ///@notice Get the current number of coins required to receive the given amount in an exchange
    ///@param _pool Pool address
    ///@param _from Address of coin to be sent
    ///@param _to Address of coin to be received
    ///@param _amount Quantity of `_to` to be received
    ///@return Quantity of `_from` to be sent
    function get_input_amount(
        address _pool,
        address _from,
        address _to,
        uint256 _amount
    ) external view returns (uint256);


    ///@notice Get the current number of coins required to receive the given amount in an exchange
    ///@param _pool Pool address
    ///@param _from Address of coin to be sent
    ///@param _to Address of coin to be received
    ///@param _amounts Quantity of `_to` to be received
    ///@return Quantity of `_from` to be sent
    function get_exchange_amounts(
        address _pool,
        address _from,
        address _to,
        uint256[] memory _amounts
    ) external view returns (uint256[] memory);


    ///@notice Set calculator contract
    ///@dev Used to calculate `get_dy` for a pool
    ///@param _pool Pool address
    ///@return `CurveCalc` address
    function get_calculator(address _pool) external view returns (address);


    /// @notice Perform up to four swaps in a single transaction
    /// @dev Routing and swap params must be determined off-chain. This
    ///     functionality is designed for gas efficiency over ease-of-use.
    /// @param _route Array of [initial token, pool, token, pool, token, ...]
    ///     The array is iterated until a pool address of 0x00, then the last
    ///     given token is transferred to `_receiver`
    /// @param _swap_params Multidimensional array of [i, j, swap type] where i and j are the correct
    ///     values for the n'th pool in `_route`. The swap type should be 1 for
    ///     a stableswap `exchange`, 2 for stableswap `exchange_underlying`, 3
    ///     for a cryptoswap `exchange`, 4 for a cryptoswap `exchange_underlying`,
    ///     5 for Polygon factory metapools `exchange_underlying`, 6-8 for
    ///     underlying coin -> LP token "exchange" (actually `add_liquidity`), 9 and 10
    ///     for LP token -> underlying coin "exchange" (actually `remove_liquidity_one_coin`)
    /// @param _amount The amount of `_route[0]` token being sent.
    /// @param _expected The minimum amount received after the final swap.
    /// @param _pools Array of pools for swaps via zap contracts. This parameter is only needed for
    ///     Polygon meta-factories underlying swaps.
    /// @param _receiver Address to transfer the final output token to.
    /// @return Received amount of the final output token
    function exchange_multiple(
        address[9] memory _route,
        uint256[3][4] memory _swap_params,
        uint256 _amount,
        uint256 _expected,
        address[4] memory _pools,
        address _receiver
    ) external payable returns (uint256);

    function exchange_multiple(
        address[9] memory _route,
        uint256[3][4] memory _swap_params,
        uint256 _amount,
        uint256 _expected
    ) external payable returns (uint256);

    function get_exchange_multiple_amount(
        address[9] memory _route,
        uint256[3][4] memory _swap_params,
        uint256 _amount
    ) external view returns (uint256);
}