// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../auth/AdminAuth.sol";
import { IBotRegistry } from "../interfaces/core/IBotRegistry.sol";
import { TokenUtils } from "./token/TokenUtils.sol";
import { UtilAddresses } from "./addresses/UtilAddresses.sol";
import { IERC20 } from "../interfaces/token/IERC20.sol";
import { FeeRecipient } from "./fee/FeeRecipient.sol";

/// @title Contract used to refill tx sending bots when they are low on eth
contract BotRefills is AdminAuth, UtilAddresses {
    using TokenUtils for address;

    error WrongRefillCallerError(address caller);
    error NotAuthBotError(address bot);

    mapping(address => bool) public additionalBots;

    modifier isApprovedBot(address _botAddr) {
        if (!(IBotRegistry(BOT_REGISTRY_ADDRESS).botList(_botAddr) || additionalBots[_botAddr])) {
            revert NotAuthBotError(_botAddr);
        }

        _;
    }

    modifier isRefillCaller() {
        if (msg.sender != refillCaller) {
            revert WrongRefillCallerError(msg.sender);
        }

        _;
    }

    function refill(uint256 _ethAmount, address _botAddress) public isRefillCaller isApprovedBot(_botAddress) {
        address feeAddr = FeeRecipient(FEE_RECIPIENT_ADDR).getFeeAddr();

        bool success = IERC20(TokenUtils.WETH_ADDR).transferFrom(feeAddr, address(this), _ethAmount);
        if (!success) revert("Transfer failed");

        TokenUtils.withdrawWeth(_ethAmount);
        payable(_botAddress).transfer(_ethAmount);
    }

    function refillMany(uint256[] memory _ethAmounts, address[] memory _botAddresses) public {
        for (uint256 i = 0; i < _botAddresses.length; ++i) {
            refill(_ethAmounts[i], _botAddresses[i]);
        }
    }

    ///////////////////////// ONLY OWNER METHODS /////////////////////////

    function setRefillCaller(address _newBot) public onlyOwner {
        refillCaller = _newBot;
    }

    function setAdditionalBot(address _botAddr, bool _approved) public onlyOwner {
        additionalBots[_botAddr] = _approved;
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable { }
}
