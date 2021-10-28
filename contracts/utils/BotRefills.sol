// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../auth/AdminAuth.sol";
import "../interfaces/exchange/IUniswapRouter.sol";
import "../interfaces/IBotRegistry.sol";
import "./TokenUtils.sol";
import "./helpers/UtilHelper.sol";

/// @title Contract used to refill tx sending bots when they are low on eth
contract BotRefills is AdminAuth, UtilHelper {
    using TokenUtils for address;
    error WrongRefillCallerError();
    error NotAuthBotError();

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

    function refill(uint256 _ethAmount, address _botAddress)
        public
        isRefillCaller
        isApprovedBot(_botAddress)
    {
        // check if we have enough weth to send
        uint256 wethBalance = IERC20(TokenUtils.WETH_ADDR).balanceOf(feeAddr);

        if (wethBalance >= _ethAmount) {
            IERC20(TokenUtils.WETH_ADDR).transferFrom(feeAddr, address(this), _ethAmount);

            TokenUtils.withdrawWeth(_ethAmount);
            payable(_botAddress).transfer(_ethAmount);
        } else {
            address[] memory path = new address[](2);
            path[0] = DAI_ADDR;
            path[1] = TokenUtils.WETH_ADDR;

            // get how much dai we need to convert
            uint256 daiAmount = getEth2Dai(_ethAmount);

            IERC20(DAI_ADDR).transferFrom(feeAddr, address(this), daiAmount);
            DAI_ADDR.approveToken(address(router), daiAmount);

            // swap and transfer directly to botAddress
            router.swapExactTokensForETH(daiAmount, 1, path, _botAddress, block.timestamp + 1);
        }
    }

    function refillMany(uint256[] memory _ethAmounts, address[] memory _botAddresses) public {
        for(uint i = 0; i < _botAddresses.length; ++i) {
            refill(_ethAmounts[i], _botAddresses[i]);
        }
    }

    /// @dev Returns Dai amount, given eth amount based on uniV2 pool price
    function getEth2Dai(uint256 _ethAmount) internal view returns (uint256 daiAmount) {
        address[] memory path = new address[](2);
        path[0] = TokenUtils.WETH_ADDR;
        path[1] = DAI_ADDR;

        daiAmount = router.getAmountsOut(_ethAmount, path)[1];
    }

    function setRefillCaller(address _newBot) public onlyOwner {
        refillCaller = _newBot;
    }

    function setFeeAddr(address _newFeeAddr) public onlyOwner {
        feeAddr = _newFeeAddr;
    }

    function setAdditionalBot(address _botAddr, bool _approved) public onlyOwner {
        additionalBots[_botAddr] = _approved;
    }

    receive() external payable {}
}
