// SPDX-License-Identifier: MIT

pragma solidity =0.8.27;

import { SafeERC20 } from "../utils/SafeERC20.sol";
import { IERC20 } from "../interfaces/IERC20.sol";

/// @title Helper contract where we can retrieve the 2 wei Dydx fee
contract FLFeeFaucet {

    using SafeERC20 for IERC20;

    /// @notice Sends 2 wei to msg.sender
    /// @dev Anyone can call this method but it's not economically feasible to drain
    /// @param _tokenAddr Address of the token we want 2 wei
    function my2Wei(address _tokenAddr) public {
        IERC20(_tokenAddr).safeTransfer(msg.sender, 2);
    }
}