// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";
import "../interfaces/exchange/IUniswapRouter.sol";
import "../interfaces/IBotRegistry.sol";
import "../utils/TokenPriceHelper.sol";
import "./TokenUtils.sol";
import "./FeeRecipient.sol";


/// @title Contract used to refill tx sending bots when they are low on eth
contract BotRefills is AdminAuth, TokenPriceHelper {
    using TokenUtils for address;
    error WrongRefillCallerError();
    error NotAuthBotError();

    uint256 public constant ALLOWED_SLIPPAGE = 2e16;

    FeeRecipient public constant feeRecipient = FeeRecipient(FEE_RECIPIENT);

    IUniswapRouter internal router = IUniswapRouter(UNI_V2_ROUTER);

    mapping(address => bool) public additionalBots;

    modifier isApprovedBot(address _botAddr) {
        if (!(IBotRegistry(BOT_REGISTRY_ADDRESS).botList(_botAddr) || additionalBots[_botAddr])){
            revert NotAuthBotError();
        }

        _;
    }

    modifier isRefillCaller {
        if (msg.sender != refillCaller){
            revert WrongRefillCallerError();
        }
        _;
    }

    /// @dev _minPrice is DAI/ETH price - allowed slippage %
    function refill(uint256 _ethAmount, uint256 _minPrice, address _botAddress)
        public
        isRefillCaller
        isApprovedBot(_botAddress)
    {
        address feeReceiverAddr = feeRecipient.getFeeAddr();
        // check if we have enough weth to send
        uint256 wethBalance = IERC20(TokenUtils.WETH_ADDR).balanceOf(feeReceiverAddr);

        if (wethBalance >= _ethAmount) {
            IERC20(TokenUtils.WETH_ADDR).transferFrom(feeReceiverAddr, address(this), _ethAmount);
            TokenUtils.withdrawWeth(_ethAmount);
            payable(_botAddress).transfer(_ethAmount);
        } else {
            // get min price using oracles if not sent
            if (_minPrice == 0) {
                _minPrice = getPriceInETH(DAI_ADDR) * (1e18 - ALLOWED_SLIPPAGE) / 1e18;
            }
            uint256 daiAmount = _ethAmount * 1e18 / _minPrice;
            IERC20(DAI_ADDR).transferFrom(feeReceiverAddr, address(this), daiAmount);
            DAI_ADDR.approveToken(address(router), daiAmount);

            address[] memory path = new address[](2);
            path[0] = DAI_ADDR;
            path[1] = TokenUtils.WETH_ADDR;
            // swap and transfer directly to botAddress
            router.swapExactTokensForETH(daiAmount, _ethAmount, path, _botAddress, block.timestamp + 1);
        }
    }

    function refillMany(uint256[] memory _ethAmounts, uint256 _minPrice, address[] memory _botAddresses) public {
        for(uint256 i = 0; i < _botAddresses.length; ++i) {
            refill(_ethAmounts[i], _minPrice, _botAddresses[i]);
        }
    }

    function setRefillCaller(address _newBot) public onlyOwner {
        refillCaller = _newBot;
    }

    function setAdditionalBot(address _botAddr, bool _approved) public onlyOwner {
        additionalBots[_botAddr] = _approved;
    }

    function setAdditionalBots(address[] calldata _botAddresses, bool[] calldata _approved) public {
        for (uint256 i = 0; i < _botAddresses.length; ++i){
            setAdditionalBot(_botAddresses[i], _approved[i]);
        }
    }

    receive() external payable {}
}
