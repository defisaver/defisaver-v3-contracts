
// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import "forge-std/Test.sol";
import "forge-std/Vm.sol";
import "forge-std/Test.sol";

import { IUniswapRouter } from "../../contracts/interfaces/exchange/IUniswapRouter.sol";
import { IERC20 } from "../../contracts/interfaces/IERC20.sol";
import { TokenPriceHelper } from "../../contracts/utils/TokenPriceHelper.sol";
import { TokenUtils } from "../../contracts/utils/TokenUtils.sol";

import { Addresses } from "../utils/Addresses.sol";

import { console } from "forge-std/console.sol";

contract Tokens is Test {

    using stdStorage for StdStorage;
    using TokenUtils for address;

    error TokenNotFound(string tokenName);
    error AmountGotMismatch(address tokenAddr, uint256 expected, uint256 got);

    // @dev mapping from token name to token address
    mapping(string => address) public tokenNames;

    // @dev list of tokens that does not work with deal function in foundry
    mapping(address => bool) public blacklistedTokensForDeal;

    bool private tokenNamesInitialized = false;
    bool private blacklistedTokensInitialized = false;

    function initTokenNamesIfNeeded() public {
        if (!tokenNamesInitialized) {
            tokenNames["WETH"] = Addresses.WETH_ADDR;
            tokenNames["WBTC"] = Addresses.WBTC_ADDR;
            tokenNames["DAI"] = Addresses.DAI_ADDR;
            tokenNames["USDC"] = Addresses.USDC_ADDR;
            tokenNames["WSETH"] = Addresses.WSTETH_ADDR;
            tokenNames["LUSD"] = Addresses.LUSD_ADDR;
            tokenNames["LINK"] = Addresses.LINK_ADDR;
            tokenNames["AAVE"] = Addresses.AAVE_ADDR;
            tokenNames["eWETH-2"] = Addresses.E_WETH_2;
            tokenNames["eWSTETH-2"] = Addresses.E_WSTETH_2;
            tokenNames["eUSDC-2"] = Addresses.E_USDC_2;

            tokenNamesInitialized = true;
        }
    }

    function initBlacklistedTokensIfNeeded() public {
        if (!blacklistedTokensInitialized) {
            blacklistedTokensForDeal[Addresses.USDC_ADDR] = true;
            blacklistedTokensForDeal[Addresses.AAVE_ADDR] = true;

            blacklistedTokensInitialized = true;
        }
    }

    function getTokenAddressFromName(string memory _name) public returns (address) {
        initTokenNamesIfNeeded();
        address tokenAddr = tokenNames[_name];
        if (tokenAddr == address(0)) {
            revert TokenNotFound(_name);
        }
        return tokenAddr;
    }

    function isTokenBlacklistedForDeal(address _token) public returns (bool) {
        initBlacklistedTokensIfNeeded();
        return blacklistedTokensForDeal[_token];
    }

    function gibTokens(address who, address token, uint256 amt) internal {
        stdstore
            .target(token)
            .sig(IERC20(token).balanceOf.selector)
            .with_key(who)
            .checked_write(amt);
    }

    function give(address _token, address _to, uint256 _amount) internal {
        if (isTokenBlacklistedForDeal(_token)) {
            vm.deal(_to, type(uint96).max);
            
            IUniswapRouter router = IUniswapRouter(Addresses.UNISWAP_ROUTER);
            address[] memory path = new address[](2);
            path[0] = Addresses.WETH_ADDR;
            path[1] = _token;
            
            vm.prank(_to);
            uint256[] memory amounts = router.swapETHForExactTokens{value: type(uint96).max}(_amount, path, _to, block.timestamp);
            vm.stopPrank();

            /// @dev make sure we get exact amount of tokens
            if (amounts[1] != _amount) {
                revert AmountGotMismatch(_token, _amount, amounts[1]);
            }
        }
        else {
            deal(_token, _to, _amount);
        }
    }

    function amountInUSDPrice(address _tokenAddr, uint _amountUSD) internal returns (uint) {
        TokenPriceHelper t = new TokenPriceHelper();
        uint USD_DECIMALS = 8;

        uint decimals = IERC20(_tokenAddr).decimals();
        return (_amountUSD * 10**(decimals + USD_DECIMALS) / t.getPriceInUSD(_tokenAddr));
    }

    function amountInUSDPriceMock(address _tokenAddr, uint _amountUSD, uint256 _priceInUsdIn8Decimals) internal view returns (uint) {
        uint USD_DECIMALS = 8;

        uint decimals = IERC20(_tokenAddr).decimals();
        return (_amountUSD * 10**(decimals + USD_DECIMALS) / _priceInUsdIn8Decimals);
    }
}