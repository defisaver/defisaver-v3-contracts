// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";
import "../interfaces/uniswap/v3/ISwapRouter.sol";
import "../interfaces/IBotRegistry.sol";
import "../utils/TokenPriceHelperL2.sol";
import "./TokenUtils.sol";
import "./helpers/UtilHelper.sol";
import "./FeeRecipient.sol";


/// @title Contract used to refill tx sending bots when they are low on eth
contract BotRefillsL2 is AdminAuth, TokenPriceHelperL2 {
    using TokenUtils for address;
    error WrongRefillCallerError();
    error NotAuthBotError();

    uint256 public constant ALLOWED_SLIPPAGE = 2e16;

    FeeRecipient public constant feeRecipient = FeeRecipient(FEE_RECIPIENT);

    ISwapRouter internal router = ISwapRouter(UNI_V3_ROUTER);

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

    constructor() {
        additionalBots[DEFAULT_BOT] = true;
    }

    function refill(uint256 _ethAmount, uint256 _daiPriceInEth, address _botAddress)
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
            // get how much dai we need to convert
            if (_daiPriceInEth == 0) {
                _daiPriceInEth = _daiPriceInEth = getPriceInETH(DAI_ADDR) * (1e18 - ALLOWED_SLIPPAGE) / 1e18;
            }
            uint256 daiAmount = _ethAmount * 1e18 / _daiPriceInEth;

            IERC20(DAI_ADDR).transferFrom(feeReceiverAddr, address(this), daiAmount);
            DAI_ADDR.approveToken(address(router), daiAmount);

            ISwapRouter.ExactInputSingleParams memory params =
                        ISwapRouter.ExactInputSingleParams({
                            tokenIn: DAI_ADDR,
                            tokenOut: TokenUtils.WETH_ADDR,
                            fee: 3000,
                            recipient: address(this),
                            deadline: block.timestamp,
                            amountIn: daiAmount,
                            amountOutMinimum: _ethAmount,
                            sqrtPriceLimitX96: 0
                        });
            router.exactInputSingle(params);
            TokenUtils.withdrawWeth(_ethAmount);
            payable(_botAddress).transfer(_ethAmount);  
        }
    }

    function refillMany(uint256[] memory _ethAmounts, uint256 _daiPriceInEth, address[] memory _botAddresses) public {
        for(uint i = 0; i < _botAddresses.length; ++i) {
            refill(_ethAmounts[i], _daiPriceInEth, _botAddresses[i]);
        }
    }

    function setRefillCaller(address _newBot) public onlyOwner {
        refillCaller = _newBot;
    }

    function setAdditionalBot(address _botAddr, bool _approved) public onlyOwner {
        additionalBots[_botAddr] = _approved;
    }

    receive() external payable {}
}
