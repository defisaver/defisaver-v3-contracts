// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;

import "../auth/AdminAuth.sol";
import "../interfaces/exchange/IUniswapRouter.sol";
import "../interfaces/IBotRegistry.sol";
import "./TokenUtils.sol";

/// @title Contract used to refill tx sending bots when they are low on eth
contract BotRefills is AdminAuth {
    using TokenUtils for address;

    address internal refillCaller = 0x33fDb79aFB4456B604f376A45A546e7ae700e880;
    address internal feeAddr = 0x76720aC2574631530eC8163e4085d6F98513fb27;

    address internal constant BOT_REGISTRY_ADDRESS = 0x637726f8b08a7ABE3aE3aCaB01A80E2d8ddeF77B;
    address internal constant DAI_ADDR = 0x6B175474E89094C44Da98b954EedeAC495271d0F;

    IUniswapRouter internal router = IUniswapRouter(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);

    mapping(address => bool) public additionalBots;

    constructor() {
        additionalBots[0x33fDb79aFB4456B604f376A45A546e7ae700e880] = true;
        additionalBots[0x7fb85Bab66C4a14eb4c048a34CEf0AB16747778d] = true;
        additionalBots[0x446aD06C447b26D129C131E893f48b3a518a63c7] = true;
    }

    modifier isApprovedBot(address _botAddr) {
        require(
            IBotRegistry(BOT_REGISTRY_ADDRESS).botList(_botAddr) || additionalBots[_botAddr],
            "Not auth bot"
        );

        _;
    }

    modifier isRefillCaller {
        require(msg.sender == refillCaller, "Wrong refill caller");
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
