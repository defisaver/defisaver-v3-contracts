// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { TokenGroupRegistry } from "../../contracts/exchangeV3/registries/TokenGroupRegistry.sol";
import { AdminAuth } from "../../contracts/auth/AdminAuth.sol";

import { Addresses } from "../utils/Addresses.sol";
import { BaseTest } from "../utils/BaseTest.sol";
import { console } from "forge-std/console.sol";

contract TestTokenGroupRegistry is BaseTest, TokenGroupRegistry {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    TokenGroupRegistry cut;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("TokenGroupRegistry");

        cut = new TokenGroupRegistry();

        vm.startPrank(Addresses.OWNER_ADDR);

        // add stable tokens
        address[] memory stableTokens = new address[](2);
        stableTokens[0] = Addresses.DAI_ADDR;
        stableTokens[1] = Addresses.USDC_ADDR;
        cut.addTokensInGroup(stableTokens, uint256(Groups.STABLECOIN));

        // add eth based tokens
        address[] memory ethBasedTokens = new address[](3);
        ethBasedTokens[0] = Addresses.STETH_ADDR;
        ethBasedTokens[1] = Addresses.WSTETH_ADDR;
        ethBasedTokens[2] = Addresses.ETH_ADDR;
        cut.addTokensInGroup(ethBasedTokens, uint256(Groups.ETH_BASED));

        // add btc based tokens
        address[] memory btcBasedTokens = new address[](2);
        btcBasedTokens[0] = Addresses.WBTC_ADDR;
        btcBasedTokens[1] = Addresses.RENBTC_ADDR;
        cut.addTokensInGroup(btcBasedTokens, uint256(Groups.BTC_BASED));

        // change stable group fee
        cut.changeGroupFee(uint256(Groups.STABLECOIN), STABLE_FEE_DIVIDER);

        // change eth based group fee
        cut.changeGroupFee(uint256(Groups.ETH_BASED), STANDARD_FEE_DIVIDER);

        // change btc based group fee
        cut.changeGroupFee(uint256(Groups.BTC_BASED), STANDARD_FEE_DIVIDER);

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function testGetFeeForRegisteredTokens() public view {
        assertEq(cut.groupIds(Addresses.DAI_ADDR), uint256(Groups.STABLECOIN));
        assertEq(cut.groupIds(Addresses.USDC_ADDR), uint256(Groups.STABLECOIN));
        assertEq(
            cut.getFeeForTokens(Addresses.DAI_ADDR, Addresses.USDC_ADDR),
            STABLE_FEE_DIVIDER
        );

        assertEq(cut.groupIds(Addresses.WSTETH_ADDR), uint256(Groups.ETH_BASED));
        assertEq(cut.groupIds(Addresses.STETH_ADDR), uint256(Groups.ETH_BASED));
        assertEq(
            cut.getFeeForTokens(Addresses.WSTETH_ADDR, Addresses.STETH_ADDR),
            STANDARD_FEE_DIVIDER
        );

        assertEq(cut.groupIds(Addresses.WBTC_ADDR), uint256(Groups.BTC_BASED));
        assertEq(cut.groupIds(Addresses.RENBTC_ADDR), uint256(Groups.BTC_BASED));
        assertEq(
            cut.getFeeForTokens(Addresses.WBTC_ADDR, Addresses.RENBTC_ADDR),
            STANDARD_FEE_DIVIDER
        );
    }

    function testAddBannedToken() public {
        vm.startPrank(Addresses.OWNER_ADDR);

        cut.addTokenInGroup(Addresses.BANNED_TOKEN_ADDR, uint256(Groups.BANNED));

        vm.stopPrank();

        assertEq(
            cut.getFeeForTokens(Addresses.BANNED_TOKEN_ADDR, Addresses.ETH_ADDR),
            0
        );
        assertEq(cut.groupIds(Addresses.BANNED_TOKEN_ADDR), uint256(Groups.BANNED));
    }

    function testGetFeeForStandardTokens() public view {
        assertEq(
            cut.getFeeForTokens(Addresses.YFI_ADDR, Addresses.ETH_ADDR),
            STANDARD_FEE_DIVIDER
        );
        assertEq(cut.groupIds(Addresses.YFI_ADDR), uint256(Groups.NOT_LISTED));
        assertEq(cut.groupIds(Addresses.ETH_ADDR), uint256(Groups.ETH_BASED));

        assertEq(
            cut.getFeeForTokens(Addresses.ETH_ADDR, Addresses.YFI_ADDR),
            STANDARD_FEE_DIVIDER
        );

        assertEq(
            cut.getFeeForTokens(Addresses.YFI_ADDR, Addresses.MKR_ADDR),
            STANDARD_FEE_DIVIDER
        );
        assertEq(cut.groupIds(Addresses.YFI_ADDR), uint256(Groups.NOT_LISTED));
        assertEq(cut.groupIds(Addresses.MKR_ADDR), uint256(Groups.NOT_LISTED));
    }

    function testAddNewTokenGroup() public {
        vm.startPrank(Addresses.OWNER_ADDR);

        uint256 nextGroupNumber = 5;
        uint256 feeDivider = 555;

        address[] memory tokens = new address[](2);
        tokens[0] = Addresses.YFI_ADDR;
        tokens[1] = Addresses.MKR_ADDR;

        cut.addNewGroup(tokens, feeDivider);

        assertEq(cut.groupIds(Addresses.YFI_ADDR), nextGroupNumber);
        assertEq(cut.groupIds(Addresses.MKR_ADDR), nextGroupNumber);

        assertEq(
            cut.getFeeForTokens(Addresses.YFI_ADDR, Addresses.MKR_ADDR),
            feeDivider
        );

        vm.stopPrank();
    }

    function testChangeFeeForTokenGroup() public {
        vm.startPrank(Addresses.OWNER_ADDR);

        cut.changeGroupFee(uint256(Groups.ETH_BASED), 100);

        assertEq(
            cut.getFeeForTokens(Addresses.WSTETH_ADDR, Addresses.STETH_ADDR),
            100
        );
    }

    function testRevertToAddTokenIfNotOwner() public {
        vm.expectRevert();
        cut.addTokenInGroup(Addresses.ETH_ADDR, uint256(Groups.ETH_BASED));
    }

    function testRevertToAddTokensIfNotOwner() public {
        vm.expectRevert();
        address[] memory tokens = new address[](2);
        tokens[0] = Addresses.ETH_ADDR;
        tokens[1] = Addresses.WETH_ADDR;

        cut.addTokensInGroup(tokens, uint256(Groups.ETH_BASED));
    }

    function testRevertToAddNewGroupIfNotOwner() public {
        vm.expectRevert();

        address[] memory tokens = new address[](2);
        tokens[0] = Addresses.YFI_ADDR;
        tokens[1] = Addresses.MKR_ADDR;

        cut.addNewGroup(tokens, 666);
    }

    function testRevertToChangeGroupFeeIfNotOwner() public {
        vm.expectRevert();

        cut.changeGroupFee(uint256(Groups.ETH_BASED), 5000);
    }

    function testRevertToChangeFeeTooHigh() public {
        vm.startPrank(Addresses.OWNER_ADDR);

        vm.expectRevert();
        cut.changeGroupFee(uint256(Groups.ETH_BASED), 10);

        vm.stopPrank();
    }

    function testRevertToCreateGroupFeeTooHigh() public {
        vm.startPrank(Addresses.OWNER_ADDR);

        address[] memory tokens = new address[](2);
        tokens[0] = Addresses.YFI_ADDR;
        tokens[1] = Addresses.MKR_ADDR;

        uint256 feeDivider = 1;
        vm.expectRevert(abi.encodeWithSelector(TokenGroupRegistry.FeeTooHigh.selector, feeDivider));
        cut.addNewGroup(tokens, feeDivider);

        vm.stopPrank();
    }

    function testRevertToAddTokenToNonExistentGroup() public {
        vm.startPrank(Addresses.OWNER_ADDR);
        
        uint256 groupId = 42;
        vm.expectRevert(abi.encodeWithSelector(TokenGroupRegistry.GroupNonExistent.selector, groupId));
        cut.addTokenInGroup(Addresses.ETH_ADDR, groupId);

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                       HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function populateRegistry() internal {
        vm.startPrank(Addresses.OWNER_ADDR);

        // blocked
        cut.addTokenInGroup(Addresses.BANNED_TOKEN_ADDR, uint256(Groups.BANNED));

        // stable based
        cut.addTokenInGroup(Addresses.DAI_ADDR, uint256(Groups.STABLECOIN));
        cut.addTokenInGroup(Addresses.USDC_ADDR, uint256(Groups.STABLECOIN));
        cut.addTokenInGroup(Addresses.USDT_ADDR, uint256(Groups.STABLECOIN));

        // eth based
        cut.addTokenInGroup(Addresses.ETH_ADDR, uint256(Groups.ETH_BASED));
        cut.addTokenInGroup(Addresses.WETH_ADDR, uint256(Groups.ETH_BASED));
        cut.addTokenInGroup(Addresses.WSTETH_ADDR, uint256(Groups.ETH_BASED));
        cut.addTokenInGroup(Addresses.STETH_ADDR, uint256(Groups.ETH_BASED));

        // wbtc based
        cut.addTokenInGroup(Addresses.WBTC_ADDR, uint256(Groups.BTC_BASED));
        cut.addTokenInGroup(Addresses.RENBTC_ADDR, uint256(Groups.BTC_BASED));

        vm.stopPrank();
    }
}
