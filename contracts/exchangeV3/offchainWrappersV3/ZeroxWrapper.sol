// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../auth/AdminAuth.sol";
import "../DFSExchangeHelper.sol";
import "../../interfaces/exchange/IOffchainWrapper.sol";

contract ZeroxWrapper is IOffchainWrapper, DFSExchangeHelper, AdminAuth {

    using TokenUtils for address;
    using SafeERC20 for IERC20;

    /// @notice Takes order from 0x and returns bool indicating if it is successful
    /// @param _exData Exchange data
    function takeOrder(
        ExchangeData memory _exData
    ) override public payable returns (bool success, uint256) {
        /// @dev approve 0x allowance contract
        IERC20(_exData.srcAddr).safeApprove(_exData.offchainData.allowanceTarget, _exData.srcAmount);

        uint256 tokensBefore = _exData.destAddr.getBalance(address(this));

        /// @dev the amount of tokens received is checked in DFSExchangeCore
        /// @dev Exchange wrapper contracts should not be used on their own
        (success, ) = _exData.offchainData.exchangeAddr.call(_exData.offchainData.callData);
        uint256 tokensSwapped = 0;

        if (success) {
            // get the current balance of the swapped tokens
            tokensSwapped = _exData.destAddr.getBalance(address(this)) - tokensBefore;
            if (tokensSwapped == 0){
                revert ZeroTokensSwapped();
            }
        }

        // returns all funds from src addr, dest addr and eth funds (protocol fee leftovers)
        sendLeftover(_exData.srcAddr, _exData.destAddr, payable(msg.sender));

        return (success, tokensSwapped);
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external virtual payable {}
}