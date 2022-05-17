// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "ds-test/test.sol";
import "forge-std/console.sol";

import "../../contracts/exchangeV3/TokenGroupRegistry.sol";
import "../../contracts/auth/AdminAuth.sol";

import "../CheatCodes.sol";
import "../TokenAddresses.sol";

contract TestTokenGroupRegistry is DSTest, TokenAddresses, TokenGroupRegistry {

    CheatCodes vm = CheatCodes(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    TokenGroupRegistry tokenGroupRegistry;

    constructor() {
        tokenGroupRegistry = new TokenGroupRegistry();
        populateRegistry();
    }

    function testGetFeeForRegisteredTokens() public {
        assertEq(
            tokenGroupRegistry.getFeeForTokens(DAI_ADDR, USDC_ADDR),
            TokenGroupRegistry.STABLE_FEE_DIVIDER
        );
        assertEq(tokenGroupRegistry.groupIds(DAI_ADDR), uint256(Groups.STABLECOIN));
        assertEq(tokenGroupRegistry.groupIds(USDC_ADDR), uint256(Groups.STABLECOIN));


        assertEq(
            tokenGroupRegistry.getFeeForTokens(WSTETH_ADDR, STETH_ADDR),
            TokenGroupRegistry.STABLE_FEE_DIVIDER
        );
        assertEq(tokenGroupRegistry.groupIds(WSTETH_ADDR), uint256(Groups.ETH_BASED));
        assertEq(tokenGroupRegistry.groupIds(STETH_ADDR), uint256(Groups.ETH_BASED));

        assertEq(
            tokenGroupRegistry.getFeeForTokens(WBTC_ADDR, RENBTC_ADDR),
            TokenGroupRegistry.STABLE_FEE_DIVIDER
        );
        assertEq(tokenGroupRegistry.groupIds(WBTC_ADDR), uint256(Groups.BTC_BASED));
        assertEq(tokenGroupRegistry.groupIds(RENBTC_ADDR), uint256(Groups.BTC_BASED));

    }

    function testFeeForBannedToken() public {
        assertEq(
            tokenGroupRegistry.getFeeForTokens(BANNED_TOKEN_ADDR, ETH_ADDR),
            0
        );
        assertEq(tokenGroupRegistry.groupIds(BANNED_TOKEN_ADDR), uint256(Groups.BANNED));
    }

    function testGetFeeForStandardTokens() public {
        assertEq(
            tokenGroupRegistry.getFeeForTokens(YFI_ADDR, ETH_ADDR),
            TokenGroupRegistry.STANDARD_FEE_DIVIDER
        );
        assertEq(tokenGroupRegistry.groupIds(YFI_ADDR), uint256(Groups.NOT_LISTED));
        assertEq(tokenGroupRegistry.groupIds(ETH_ADDR), uint256(Groups.ETH_BASED));

        assertEq(
            tokenGroupRegistry.getFeeForTokens(ETH_ADDR, YFI_ADDR),
            TokenGroupRegistry.STANDARD_FEE_DIVIDER
        );

        assertEq(
            tokenGroupRegistry.getFeeForTokens(YFI_ADDR, MKR_ADDR),
            TokenGroupRegistry.STANDARD_FEE_DIVIDER
        );
        assertEq(tokenGroupRegistry.groupIds(YFI_ADDR), uint256(Groups.NOT_LISTED));
        assertEq(tokenGroupRegistry.groupIds(MKR_ADDR), uint256(Groups.NOT_LISTED));
    
    }

    function testAddNewTokenGroup() public {
        vm.startPrank(OWNER_ADDR);

        address[] memory tokens = new address[](2);
        tokens[0] = YFI_ADDR;
        tokens[1] = MKR_ADDR;

        tokenGroupRegistry.addNewGroup(tokens, 666);

        assertEq(tokenGroupRegistry.groupIds(YFI_ADDR), 5);
        assertEq(tokenGroupRegistry.groupIds(MKR_ADDR), 5);

        assertEq(
            tokenGroupRegistry.getFeeForTokens(YFI_ADDR, MKR_ADDR),
            666
        );

        vm.stopPrank();
    }

    function testChangeFeeForTokenGroup() public {
        vm.startPrank(OWNER_ADDR);

        tokenGroupRegistry.changeGroupFee(uint256(Groups.ETH_BASED), 5000);

        assertEq(
            tokenGroupRegistry.getFeeForTokens(WSTETH_ADDR, STETH_ADDR),
            5000
        );
    }

    function testFailToAddTokenIfNotOwner() public {
        vm.expectRevert();
        tokenGroupRegistry.addTokenInGroup(ETH_ADDR, uint256(Groups.ETH_BASED));
    }

    function testFailToAddTokenToNonExistentGroup() public {
        vm.startPrank(OWNER_ADDR);

        vm.expectRevert(abi.encodeWithSelector(TokenGroupRegistry.FeeTooHigh.selector, 1));
        tokenGroupRegistry.addTokenInGroup(ETH_ADDR, 17);

        vm.stopPrank();
    }

    function testFailToAddTokensIfNotOwner() public {
        vm.expectRevert();
        address[] memory tokens = new address[](2);
        tokens[0] = ETH_ADDR;
        tokens[1] = WETH_ADDR;

        tokenGroupRegistry.addTokensInGroup(tokens, uint256(Groups.ETH_BASED));
    }

    function testFailToAddNewGroupIfNotOwner() public {
        vm.expectRevert();

        address[] memory tokens = new address[](2);
        tokens[0] = YFI_ADDR;
        tokens[1] = MKR_ADDR;

        tokenGroupRegistry.addNewGroup(tokens, 666);
    }

    function testFailToChangeGroupFeeIfNotOwner() public {
        vm.expectRevert();

        tokenGroupRegistry.changeGroupFee(uint256(Groups.ETH_BASED), 5000);
    }

    function testFailToChangeFeeTooHigh() public {
        vm.startPrank(OWNER_ADDR);

        vm.expectRevert();
        tokenGroupRegistry.changeGroupFee(uint256(Groups.ETH_BASED), 10);

        vm.stopPrank();
    }

    function testFailToCreateGroupFeeTooHigh() public {
        vm.startPrank(OWNER_ADDR);

        address[] memory tokens = new address[](2);
        tokens[0] = YFI_ADDR;
        tokens[1] = MKR_ADDR;

        vm.expectRevert();
        tokenGroupRegistry.addNewGroup(tokens, 1);

        vm.stopPrank();
    }

    //////////////////////// INTERNAL ////////////////////////

    function populateRegistry() internal {
        vm.startPrank(OWNER_ADDR);

        // blocked
        tokenGroupRegistry.addTokenInGroup(BANNED_TOKEN_ADDR, uint256(Groups.BANNED));

        // stable based
        tokenGroupRegistry.addTokenInGroup(DAI_ADDR, uint256(Groups.STABLECOIN));
        tokenGroupRegistry.addTokenInGroup(USDC_ADDR, uint256(Groups.STABLECOIN));
        tokenGroupRegistry.addTokenInGroup(USDT_ADDR, uint256(Groups.STABLECOIN));

        // eth based
        tokenGroupRegistry.addTokenInGroup(ETH_ADDR, uint256(Groups.ETH_BASED));
        tokenGroupRegistry.addTokenInGroup(WETH_ADDR, uint256(Groups.ETH_BASED));
        tokenGroupRegistry.addTokenInGroup(WSTETH_ADDR, uint256(Groups.ETH_BASED));
        tokenGroupRegistry.addTokenInGroup(STETH_ADDR, uint256(Groups.ETH_BASED));

        // wbtc based
        tokenGroupRegistry.addTokenInGroup(WBTC_ADDR, uint256(Groups.BTC_BASED));
        tokenGroupRegistry.addTokenInGroup(RENBTC_ADDR, uint256(Groups.BTC_BASED));

        vm.stopPrank();
    }
}
