// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "../interfaces/IWETH.sol";

/// @title Helper contract where we can retreive the 2 wei Dydx fee
contract FLFeeFaucet {
    address public constant WETH_ADDR = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    /// @notice Sends 2 wei to msg.sender
    function my2Wei() public {
        IWETH(WETH_ADDR).transfer(msg.sender, 2);
    }
}