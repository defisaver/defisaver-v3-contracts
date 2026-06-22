// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ITrigger } from "../interfaces/core/ITrigger.sol";
import { IERC20 } from "../interfaces/token/IERC20.sol";
import { AdminAuth } from "../auth/AdminAuth.sol";
import { TokenUtils } from "../utils/token/TokenUtils.sol";
import { SmartWalletUtils } from "../utils/SmartWalletUtils.sol";

/// @notice Checks if the user has enough balance and allowance of the token to trigger the strategy execution.
contract RequiredAmountAndAllowanceTrigger is ITrigger, AdminAuth, SmartWalletUtils {
    using TokenUtils for address;

    /// @param user address of the Smart Wallet that has subscription
    /// @param sellTokenAddr address of the token that is being sold. Will always be ERC20 token. For ether, it will be WETH.
    /// @param desiredAmount amount that represents the triggerable point
    struct CalldataParams {
        address user;
        address sellTokenAddr;
        uint256 desiredAmount;
    }

    function isTriggered(bytes memory _calldata, bytes memory)
        external
        view
        override
        returns (bool)
    {
        CalldataParams memory params = parseCallInputs(_calldata);

        address tokenHolder = _fetchOwnerOrWallet(params.user);
        bool hasEnoughBalance = params.sellTokenAddr.getBalance(tokenHolder) >= params.desiredAmount;
        bool hasEnoughAllowance = true;

        if (tokenHolder != params.user) {
            hasEnoughAllowance = IERC20(params.sellTokenAddr).allowance(tokenHolder, params.user)
                >= params.desiredAmount;
        }

        return hasEnoughBalance && hasEnoughAllowance;
    }

    //solhint-disable-next-line no-empty-blocks
    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) { }

    function isChangeable() public pure override returns (bool) {
        return false;
    }

    function parseCallInputs(bytes memory _callData)
        public
        pure
        returns (CalldataParams memory params)
    {
        params = abi.decode(_callData, (CalldataParams));
    }
}
