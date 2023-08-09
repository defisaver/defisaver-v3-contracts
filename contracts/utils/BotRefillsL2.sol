// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";
import "../interfaces/uniswap/v3/ISwapRouter.sol";
import "../interfaces/uniswap/v3/IQuoter.sol";
import "../interfaces/IBotRegistry.sol";
import "../interfaces/chainlink/IAggregatorV3.sol";
import "./TokenUtils.sol";
import "./helpers/UtilHelper.sol";
import "./FeeRecipient.sol";


contract BotRefillsL2 is AdminAuth, UtilHelper {
    using TokenUtils for address;
    error WrongRefillCallerError();
    error NotAuthBotError();

    uint256 public constant ALLOWED_SLIPPAGE = 2e16;
    IAggregatorV3 internal constant daiFeed = IAggregatorV3(CHAINLINK_DAI_FEED);
    IAggregatorV3 internal constant ethFeed = IAggregatorV3(CHAINLINK_ETH_FEED);

    FeeRecipient public constant feeRecipient = FeeRecipient(FEE_RECIPIENT);

    ISwapRouter internal router = ISwapRouter(UNI_V3_ROUTER);
    IQuoter internal quoter = IQuoter(UNI_V3_QUOTER);

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

    function refill(uint256 _ethAmount, address _botAddress)
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
            uint256 daiPrice = daiFeed.latestAnswer();
            uint256 ethPrice = ethFeed.latestAnswer();
            uint256 daiAmount = _ethAmount * ethPrice * (1e18 + ALLOWED_SLIPPAGE) / daiPrice / 1e18;

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

    function refillMany(uint256[] memory _ethAmounts, address[] memory _botAddresses) public {
        for(uint i = 0; i < _botAddresses.length; ++i) {
            refill(_ethAmounts[i], _botAddresses[i]);
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
