// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "ds-test/test.sol";
import "forge-std/console.sol";

import "../../contracts/exchangeV3/TokenGroupRegistry.sol";
import "../../contracts/auth/AdminAuth.sol";

import "../CheatCodes.sol";
import "../TokenAddresses.sol";

contract TestTokenGroupRegistry is DSTest, TokenGroupRegistry {

    CheatCodes vm = CheatCodes(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    TokenGroupRegistry tokenGroupRegistry;

    constructor() {
        tokenGroupRegistry = new TokenGroupRegistry();
        populateRegistry();
    }

    function testGetFeeForRegisteredTokens() public {
        assertEq(
            tokenGroupRegistry.getFeeForTokens(TokenAddresses.DAI_ADDR, TokenAddresses.USDC_ADDR),
            TokenGroupRegistry.STABLE_FEE_DIVIDER
        );
        assertEq(tokenGroupRegistry.groupIds(TokenAddresses.DAI_ADDR), uint256(Groups.STABLECOIN));
        assertEq(tokenGroupRegistry.groupIds(TokenAddresses.USDC_ADDR), uint256(Groups.STABLECOIN));


        assertEq(
            tokenGroupRegistry.getFeeForTokens(TokenAddresses.WSTETH_ADDR, TokenAddresses.STETH_ADDR),
            TokenGroupRegistry.STABLE_FEE_DIVIDER
        );
        assertEq(tokenGroupRegistry.groupIds(TokenAddresses.WSTETH_ADDR), uint256(Groups.ETH_BASED));
        assertEq(tokenGroupRegistry.groupIds(TokenAddresses.STETH_ADDR), uint256(Groups.ETH_BASED));

        assertEq(
            tokenGroupRegistry.getFeeForTokens(TokenAddresses.WBTC_ADDR, TokenAddresses.RENBTC_ADDR),
            TokenGroupRegistry.STABLE_FEE_DIVIDER
        );
        assertEq(tokenGroupRegistry.groupIds(TokenAddresses.WBTC_ADDR), uint256(Groups.BTC_BASED));
        assertEq(tokenGroupRegistry.groupIds(TokenAddresses.RENBTC_ADDR), uint256(Groups.BTC_BASED));

    }

    function testFeeForBannedToken() public {
        assertEq(
            tokenGroupRegistry.getFeeForTokens(TokenAddresses.BANNED_TOKEN_ADDR, TokenAddresses.ETH_ADDR),
            0
        );
        assertEq(tokenGroupRegistry.groupIds(TokenAddresses.BANNED_TOKEN_ADDR), uint256(Groups.BANNED));
    }

    function testGetFeeForStandardTokens() public {
        assertEq(
            tokenGroupRegistry.getFeeForTokens(TokenAddresses.YFI_ADDR, TokenAddresses.ETH_ADDR),
            TokenGroupRegistry.STANDARD_FEE_DIVIDER
        );
        assertEq(tokenGroupRegistry.groupIds(TokenAddresses.YFI_ADDR), uint256(Groups.NOT_LISTED));
        assertEq(tokenGroupRegistry.groupIds(TokenAddresses.ETH_ADDR), uint256(Groups.ETH_BASED));

        assertEq(
            tokenGroupRegistry.getFeeForTokens(TokenAddresses.ETH_ADDR, TokenAddresses.YFI_ADDR),
            TokenGroupRegistry.STANDARD_FEE_DIVIDER
        );

        assertEq(
            tokenGroupRegistry.getFeeForTokens(TokenAddresses.YFI_ADDR, TokenAddresses.MKR_ADDR),
            TokenGroupRegistry.STANDARD_FEE_DIVIDER
        );
        assertEq(tokenGroupRegistry.groupIds(TokenAddresses.YFI_ADDR), uint256(Groups.NOT_LISTED));
        assertEq(tokenGroupRegistry.groupIds(TokenAddresses.MKR_ADDR), uint256(Groups.NOT_LISTED));
    
    }

    function testAddNewTokenGroup() public {
        vm.startPrank(TokenAddresses.OWNER_ADDR);

        address[] memory tokens = new address[](2);
        tokens[0] = TokenAddresses.YFI_ADDR;
        tokens[1] = TokenAddresses.MKR_ADDR;

        tokenGroupRegistry.addNewGroup(tokens, 666);

        assertEq(tokenGroupRegistry.groupIds(TokenAddresses.YFI_ADDR), 5);
        assertEq(tokenGroupRegistry.groupIds(TokenAddresses.MKR_ADDR), 5);

        assertEq(
            tokenGroupRegistry.getFeeForTokens(TokenAddresses.YFI_ADDR, TokenAddresses.MKR_ADDR),
            666
        );

        vm.stopPrank();
    }

    function testChangeFeeForTokenGroup() public {
        vm.startPrank(TokenAddresses.OWNER_ADDR);

        tokenGroupRegistry.changeGroupFee(uint256(Groups.ETH_BASED), 5000);

        assertEq(
            tokenGroupRegistry.getFeeForTokens(TokenAddresses.WSTETH_ADDR, TokenAddresses.STETH_ADDR),
            5000
        );
    }

    function testFailToAddTokenIfNotOwner() public {
        vm.expectRevert();
        tokenGroupRegistry.addTokenInGroup(TokenAddresses.ETH_ADDR, uint256(Groups.ETH_BASED));
    }

    function testFailToAddTokenToNonExistentGroup() public {
        vm.startPrank(TokenAddresses.OWNER_ADDR);

        vm.expectRevert(abi.encodeWithSelector(TokenGroupRegistry.FeeTooHigh.selector, 1));
        tokenGroupRegistry.addTokenInGroup(TokenAddresses.ETH_ADDR, 17);

        vm.stopPrank();
    }

    function testFailToAddTokensIfNotOwner() public {
        vm.expectRevert();
        address[] memory tokens = new address[](2);
        tokens[0] = TokenAddresses.ETH_ADDR;
        tokens[1] = TokenAddresses.WETH_ADDR;

        tokenGroupRegistry.addTokensInGroup(tokens, uint256(Groups.ETH_BASED));
    }

    function testFailToAddNewGroupIfNotOwner() public {
        vm.expectRevert();

        address[] memory tokens = new address[](2);
        tokens[0] = TokenAddresses.YFI_ADDR;
        tokens[1] = TokenAddresses.MKR_ADDR;

        tokenGroupRegistry.addNewGroup(tokens, 666);
    }

    function testFailToChangeGroupFeeIfNotOwner() public {
        vm.expectRevert();

        tokenGroupRegistry.changeGroupFee(uint256(Groups.ETH_BASED), 5000);
    }

    function testFailToChangeFeeTooHigh() public {
        vm.startPrank(TokenAddresses.OWNER_ADDR);

        vm.expectRevert();
        tokenGroupRegistry.changeGroupFee(uint256(Groups.ETH_BASED), 10);

        vm.stopPrank();
    }

    function testFailToCreateGroupFeeTooHigh() public {
        vm.startPrank(TokenAddresses.OWNER_ADDR);

        address[] memory tokens = new address[](2);
        tokens[0] = TokenAddresses.YFI_ADDR;
        tokens[1] = TokenAddresses.MKR_ADDR;

        vm.expectRevert();
        tokenGroupRegistry.addNewGroup(tokens, 1);

        vm.stopPrank();
    }

    //////////////////////// INTERNAL ////////////////////////

    function populateRegistry() internal {
        vm.startPrank(TokenAddresses.OWNER_ADDR);

        // blocked
        tokenGroupRegistry.addTokenInGroup(TokenAddresses.BANNED_TOKEN_ADDR, uint256(Groups.BANNED));

        // stable based
        tokenGroupRegistry.addTokenInGroup(TokenAddresses.DAI_ADDR, uint256(Groups.STABLECOIN));
        tokenGroupRegistry.addTokenInGroup(TokenAddresses.USDC_ADDR, uint256(Groups.STABLECOIN));
        tokenGroupRegistry.addTokenInGroup(TokenAddresses.USDT_ADDR, uint256(Groups.STABLECOIN));

        // eth based
        tokenGroupRegistry.addTokenInGroup(TokenAddresses.ETH_ADDR, uint256(Groups.ETH_BASED));
        tokenGroupRegistry.addTokenInGroup(TokenAddresses.WETH_ADDR, uint256(Groups.ETH_BASED));
        tokenGroupRegistry.addTokenInGroup(TokenAddresses.WSTETH_ADDR, uint256(Groups.ETH_BASED));
        tokenGroupRegistry.addTokenInGroup(TokenAddresses.STETH_ADDR, uint256(Groups.ETH_BASED));

        // wbtc based
        tokenGroupRegistry.addTokenInGroup(TokenAddresses.WBTC_ADDR, uint256(Groups.BTC_BASED));
        tokenGroupRegistry.addTokenInGroup(TokenAddresses.RENBTC_ADDR, uint256(Groups.BTC_BASED));

        vm.stopPrank();
    }
}
