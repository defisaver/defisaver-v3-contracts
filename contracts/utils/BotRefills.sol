// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";
import "../interfaces/IBotRegistry.sol";
import "./TokenUtils.sol";
import "./helpers/UtilHelper.sol";

/// @title Contract used to refill tx sending bots when they are low on eth
contract BotRefills is AdminAuth, UtilHelper {

    using TokenUtils for address;

    error WrongRefillCallerError(address caller);
    error NotAuthBotError(address bot);

    mapping(address => bool) public additionalBots;

    modifier isApprovedBot(address _botAddr) {
        if (!(IBotRegistry(BOT_REGISTRY_ADDRESS).botList(_botAddr) || additionalBots[_botAddr])){
            revert NotAuthBotError(_botAddr);
        }

        _;
    }

    modifier isRefillCaller {
        if (msg.sender != refillCaller){
            revert WrongRefillCallerError(msg.sender);
        }

        _;
    }

    function refill(uint256 _ethAmount, address _botAddress)
        public
        isRefillCaller
        isApprovedBot(_botAddress)
    {
        IERC20(TokenUtils.WETH_ADDR).transferFrom(feeAddr, address(this), _ethAmount);

        TokenUtils.withdrawWeth(_ethAmount);
        payable(_botAddress).transfer(_ethAmount);
    }

    function refillMany(uint256[] memory _ethAmounts, address[] memory _botAddresses) public {
        for(uint i = 0; i < _botAddresses.length; ++i) {
            refill(_ethAmounts[i], _botAddresses[i]);
        }
    }

    ///////////////////////// ONLY OWNER METHODS /////////////////////////

    function setRefillCaller(address _newBot) public onlyOwner {
        refillCaller = _newBot;
    }

    function setFeeAddr(address _newFeeAddr) public onlyOwner {
        feeAddr = _newFeeAddr;
    }

    function setAdditionalBot(address _botAddr, bool _approved) public onlyOwner {
        additionalBots[_botAddr] = _approved;
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}
}
