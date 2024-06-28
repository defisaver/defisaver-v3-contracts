// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import "forge-std/Test.sol";
import "forge-std/console.sol";

import { TokenGroupRegistry } from "../../contracts/exchangeV3/registries/TokenGroupRegistry.sol";
import { AdminAuth } from "../../contracts/auth/AdminAuth.sol";
import { CheatCodes } from "../CheatCodes.sol";
import { TokenAddresses } from "../TokenAddresses.sol";

contract TestTokenGroupRegistry is Test, TokenGroupRegistry {

    CheatCodes constant cheats = CheatCodes(VM_ADDRESS);

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
        cheats.startPrank(TokenAddresses.OWNER_ADDR);

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

        cheats.stopPrank();
    }

    function testChangeFeeForTokenGroup() public {
        cheats.startPrank(TokenAddresses.OWNER_ADDR);

        tokenGroupRegistry.changeGroupFee(uint256(Groups.ETH_BASED), 5000);

        assertEq(
            tokenGroupRegistry.getFeeForTokens(TokenAddresses.WSTETH_ADDR, TokenAddresses.STETH_ADDR),
            5000
        );
    }

    function testRevertToAddTokenIfNotOwner() public {
        cheats.expectRevert();
        tokenGroupRegistry.addTokenInGroup(TokenAddresses.ETH_ADDR, uint256(Groups.ETH_BASED));
    }

    function testRevertToAddTokensIfNotOwner() public {
        cheats.expectRevert();
        address[] memory tokens = new address[](2);
        tokens[0] = TokenAddresses.ETH_ADDR;
        tokens[1] = TokenAddresses.WETH_ADDR;

        tokenGroupRegistry.addTokensInGroup(tokens, uint256(Groups.ETH_BASED));
    }

    function testRevertToAddNewGroupIfNotOwner() public {
        cheats.expectRevert();

        address[] memory tokens = new address[](2);
        tokens[0] = TokenAddresses.YFI_ADDR;
        tokens[1] = TokenAddresses.MKR_ADDR;

        tokenGroupRegistry.addNewGroup(tokens, 666);
    }

    function testRevertToChangeGroupFeeIfNotOwner() public {
        cheats.expectRevert();

        tokenGroupRegistry.changeGroupFee(uint256(Groups.ETH_BASED), 5000);
    }

    function testRevertToChangeFeeTooHigh() public {
        cheats.startPrank(TokenAddresses.OWNER_ADDR);

        cheats.expectRevert();
        tokenGroupRegistry.changeGroupFee(uint256(Groups.ETH_BASED), 10);

        cheats.stopPrank();
    }

    function testRevertToCreateGroupFeeTooHigh() public {
        cheats.startPrank(TokenAddresses.OWNER_ADDR);

        address[] memory tokens = new address[](2);
        tokens[0] = TokenAddresses.YFI_ADDR;
        tokens[1] = TokenAddresses.MKR_ADDR;

        uint256 feeDivider = 1;
        cheats.expectRevert(abi.encodeWithSelector(TokenGroupRegistry.FeeTooHigh.selector, feeDivider));
        tokenGroupRegistry.addNewGroup(tokens, feeDivider);

        cheats.stopPrank();
    }

    function testRevertToAddTokenToNonExistentGroup() public {
        cheats.startPrank(TokenAddresses.OWNER_ADDR);
        
        uint256 groupId = 17;
        cheats.expectRevert(abi.encodeWithSelector(TokenGroupRegistry.GroupNonExistent.selector, groupId));
        tokenGroupRegistry.addTokenInGroup(TokenAddresses.ETH_ADDR, groupId);

        cheats.stopPrank();
    }

    //////////////////////// INTERNAL ////////////////////////

    function populateRegistry() internal {
        cheats.startPrank(TokenAddresses.OWNER_ADDR);

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

        cheats.stopPrank();
    }
}
