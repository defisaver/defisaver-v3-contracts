// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { TokenGroupRegistry } from "../../contracts/exchangeV3/registries/TokenGroupRegistry.sol";
import { AdminAuth } from "../../contracts/auth/AdminAuth.sol";

import { Addresses } from "../utils/helpers/MainnetAddresses.sol";
import { BaseTest } from "../utils/BaseTest.sol";

contract TestTokenGroupRegistry is BaseTest, TokenGroupRegistry {
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    TokenGroupRegistry cut;

    address constant NOT_AVAILABLE_ADDR = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("TokenGroupRegistry");

        cut = new TokenGroupRegistry();

        vm.startPrank(Addresses.OWNER_ADDR);

        setStableTokens();
        setETHBasedTokens();
        setBtcBasedTokens();

        // change stable group fee
        cut.changeGroupFee(uint256(Groups.STABLECOIN), STABLE_FEE_DIVIDER);

        // change eth based group fee
        cut.changeGroupFee(uint256(Groups.ETH_BASED), STABLE_FEE_DIVIDER);

        // change btc based group fee
        cut.changeGroupFee(uint256(Groups.BTC_BASED), STABLE_FEE_DIVIDER);

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function testGetFeeForRegisteredTokens() public view {
        assertEq(cut.groupIds(Addresses.DAI_ADDR), uint256(Groups.STABLECOIN));
        assertEq(cut.groupIds(Addresses.USDC_ADDR), uint256(Groups.STABLECOIN));
        assertEq(cut.getFeeForTokens(Addresses.DAI_ADDR, Addresses.USDC_ADDR), STABLE_FEE_DIVIDER);

        assertEq(cut.groupIds(Addresses.WETH_ADDR), uint256(Groups.ETH_BASED));
        assertEq(cut.groupIds(Addresses.WSTETH_ADDR), uint256(Groups.ETH_BASED));
        if (isMainnetSelected()) {
            assertEq(cut.groupIds(Addresses.STETH_ADDR), uint256(Groups.ETH_BASED));
        }
        assertEq(
            cut.getFeeForTokens(
                Addresses.WETH_ADDR,
                isMainnetSelected() ? Addresses.STETH_ADDR : Addresses.WSTETH_ADDR
            ),
            STABLE_FEE_DIVIDER
        );

        assertEq(cut.groupIds(Addresses.WBTC_ADDR), uint256(Groups.BTC_BASED));
        if (isMainnetSelected()) {
            assertEq(cut.groupIds(Addresses.RENBTC_ADDR), uint256(Groups.BTC_BASED));
            assertEq(
                cut.getFeeForTokens(Addresses.WBTC_ADDR, Addresses.RENBTC_ADDR), STABLE_FEE_DIVIDER
            );
        } else {
            assertEq(
                cut.getFeeForTokens(Addresses.WBTC_ADDR, Addresses.WBTC_ADDR), STABLE_FEE_DIVIDER
            );
        }
    }

    function testAddBannedToken() public {
        vm.prank(Addresses.OWNER_ADDR);
        cut.addTokenInGroup(Addresses.BANNED_TOKEN_ADDR, uint256(Groups.BANNED));

        assertEq(cut.getFeeForTokens(Addresses.BANNED_TOKEN_ADDR, Addresses.WETH_ADDR), 0);
        assertEq(cut.groupIds(Addresses.BANNED_TOKEN_ADDR), uint256(Groups.BANNED));
    }

    function testGetFeeForStandardTokens() public view {
        assertEq(cut.getFeeForTokens(Addresses.YFI_ADDR, Addresses.MKR_ADDR), STANDARD_FEE_DIVIDER);
        assertEq(cut.getFeeForTokens(Addresses.MKR_ADDR, Addresses.YFI_ADDR), STANDARD_FEE_DIVIDER);
        assertEq(cut.groupIds(Addresses.YFI_ADDR), uint256(Groups.NOT_LISTED));
        assertEq(cut.groupIds(Addresses.MKR_ADDR), uint256(Groups.NOT_LISTED));
    }

    function testAddNewTokenGroup() public {
        uint256 nextGroupNumber = 5;
        uint256 feeDivider = 555;

        address[] memory tokens = new address[](2);
        tokens[0] = Addresses.YFI_ADDR;
        tokens[1] = Addresses.MKR_ADDR;

        vm.prank(Addresses.OWNER_ADDR);
        cut.addNewGroup(tokens, feeDivider);

        assertEq(cut.groupIds(Addresses.YFI_ADDR), nextGroupNumber);
        assertEq(cut.groupIds(Addresses.MKR_ADDR), nextGroupNumber);
        assertEq(cut.getFeeForTokens(Addresses.YFI_ADDR, Addresses.MKR_ADDR), feeDivider);
    }

    function testChangeFeeForTokenGroup() public {
        vm.prank(Addresses.OWNER_ADDR);
        cut.changeGroupFee(uint256(Groups.ETH_BASED), 100);

        assertEq(
            cut.getFeeForTokens(
                Addresses.WSTETH_ADDR,
                isMainnetSelected() ? Addresses.STETH_ADDR : Addresses.WETH_ADDR
            ),
            100
        );
    }

    function testRevertToAddTokenIfNotOwner() public {
        vm.expectRevert(abi.encodeWithSelector(AdminAuth.SenderNotOwner.selector));
        cut.addTokenInGroup(Addresses.ETH_ADDR, uint256(Groups.ETH_BASED));
    }

    function testRevertToAddTokensIfNotOwner() public {
        address[] memory tokens = new address[](2);
        tokens[0] = Addresses.ETH_ADDR;
        tokens[1] = Addresses.WETH_ADDR;

        vm.expectRevert(abi.encodeWithSelector(AdminAuth.SenderNotOwner.selector));
        cut.addTokensInGroup(tokens, uint256(Groups.ETH_BASED));
    }

    function testRevertToAddNewGroupIfNotOwner() public {
        address[] memory tokens = new address[](2);
        tokens[0] = Addresses.YFI_ADDR;
        tokens[1] = Addresses.MKR_ADDR;

        vm.expectRevert(abi.encodeWithSelector(AdminAuth.SenderNotOwner.selector));
        cut.addNewGroup(tokens, 666);
    }

    function testRevertToChangeGroupFeeIfNotOwner() public {
        vm.expectRevert(abi.encodeWithSelector(AdminAuth.SenderNotOwner.selector));
        cut.changeGroupFee(uint256(Groups.ETH_BASED), 5000);
    }

    function testRevertToChangeFeeTooHigh() public {
        vm.prank(Addresses.OWNER_ADDR);
        vm.expectRevert(abi.encodeWithSelector(TokenGroupRegistry.FeeTooHigh.selector, 10));
        cut.changeGroupFee(uint256(Groups.ETH_BASED), 10);
    }

    function testRevertToCreateGroupFeeTooHigh() public {
        address[] memory tokens = new address[](2);
        tokens[0] = Addresses.YFI_ADDR;
        tokens[1] = Addresses.MKR_ADDR;
        uint256 feeDivider = 1;

        vm.prank(Addresses.OWNER_ADDR);
        vm.expectRevert(abi.encodeWithSelector(TokenGroupRegistry.FeeTooHigh.selector, feeDivider));
        cut.addNewGroup(tokens, feeDivider);
    }

    function testRevertToAddTokenToNonExistentGroup() public {
        uint256 groupId = 42;

        vm.prank(Addresses.OWNER_ADDR);
        vm.expectRevert(
            abi.encodeWithSelector(TokenGroupRegistry.GroupNonExistent.selector, groupId)
        );
        cut.addTokenInGroup(Addresses.ETH_ADDR, groupId);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                       HELPERS
    //////////////////////////////////////////////////////////////////////////*/

    function setStableTokens() internal {
        _addIfAvailable(Addresses.DAI_ADDR, uint256(Groups.STABLECOIN));
        _addIfAvailable(Addresses.USDC_ADDR, uint256(Groups.STABLECOIN));
    }

    function setETHBasedTokens() internal {
        _addIfAvailable(Addresses.WETH_ADDR, uint256(Groups.ETH_BASED));
        _addIfAvailable(Addresses.STETH_ADDR, uint256(Groups.ETH_BASED));
        _addIfAvailable(Addresses.WSTETH_ADDR, uint256(Groups.ETH_BASED));
    }

    function setBtcBasedTokens() internal {
        _addIfAvailable(Addresses.WBTC_ADDR, uint256(Groups.BTC_BASED));
        _addIfAvailable(Addresses.RENBTC_ADDR, uint256(Groups.BTC_BASED));
    }

    function _addIfAvailable(address _token, uint256 _groupId) internal {
        if (_token != NOT_AVAILABLE_ADDR) {
            cut.addTokenInGroup(_token, _groupId);
        }
    }

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
