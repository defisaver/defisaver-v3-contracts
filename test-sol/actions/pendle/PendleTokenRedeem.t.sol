// SPDX-License-Identifier: MIT

pragma solidity =0.8.27;

import { IPendleMarket } from "../../../contracts/interfaces/pendle/IPendleMarket.sol";
import { PendleTokenRedeem } from "contracts/actions/pendle/PendleTokenRedeem.sol";
import { IERC20 } from "../../../contracts/interfaces/IERC20.sol";
import { IERC4626 } from "../../../contracts/interfaces/IERC4626.sol";
import { Addresses } from "../../utils/Addresses.sol";
import { BaseTest } from "../../utils/BaseTest.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { ActionsUtils } from "../../utils/ActionsUtils.sol";

contract TestPendleTokenRedeem is BaseTest, ActionsUtils {

    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    PendleTokenRedeem cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;

    struct TestConfig {
        address market;
        address underlyingToken;
        uint256 ptAmount;
        bool isDirect;
    }

    struct PendleMarketInfo {
        address market;
        address underlyingToken;
    }

    PendleMarketInfo[] public markets;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new PendleTokenRedeem();

        // PT eUSDE 29May2025
        markets.push(PendleMarketInfo({
            market: 0x85667e484a32d884010Cf16427D90049CCf46e97,
            underlyingToken: Addresses.EUSDE_ADDR
        }));

        // PT sUSDE  29May2025
        markets.push(PendleMarketInfo({
            market: 0xB162B764044697cf03617C2EFbcB1f42e31E4766,
            underlyingToken: Addresses.SUSDE_ADDR
        }));
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_pendle_redeem() public {
        for (uint256 i = 0; i < markets.length; i++) {
            uint256 underlyingDecimals = IERC20(markets[i].underlyingToken).decimals();
            _baseTest(TestConfig({
                market: markets[i].market,
                underlyingToken: markets[i].underlyingToken,
                ptAmount: 1043240 * 10 ** underlyingDecimals,
                isDirect: false
            }));
        }
    }

    function test_pendle_redeem_action_direct() public {
        for (uint256 i = 0; i < markets.length; i++) {
            uint256 underlyingDecimals = IERC20(markets[i].underlyingToken).decimals();
            _baseTest(TestConfig({
                market: markets[i].market,
                underlyingToken: markets[i].underlyingToken,
                ptAmount: 40521300 * 10 ** underlyingDecimals,
                isDirect: true
            }));
        }
    }

    function _baseTest(
        TestConfig memory _config
    ) internal {
        (, address ptToken, ) = IPendleMarket(_config.market).readTokens();

        give(ptToken, sender, _config.ptAmount);
        approveAsSender(sender, ptToken, walletAddr, _config.ptAmount);

        uint256 minAmountOut = _config.ptAmount; // 0% slippage by default, force 1:1 rate

        // in case of sUSDE, upon maturity, 1 PTsUSDE = 1 USDE (not sUSDE)
        if (_config.underlyingToken == Addresses.SUSDE_ADDR) {
            uint256 rate = IERC4626(_config.underlyingToken).convertToShares(1 ether);
            minAmountOut = _config.ptAmount * rate / 1e18;
        }

        bytes memory callData = executeActionCalldata(
            pendleTokenRedeemEncode(
                _config.market,
                _config.underlyingToken,
                sender,
                sender,
                _config.ptAmount,
                minAmountOut
            ),
            _config.isDirect
        );

        uint256 ptTokenBalanceBefore = balanceOf(ptToken, sender);
        uint256 underlyingTokenBalanceBefore = balanceOf(_config.underlyingToken, sender);

        wallet.execute(address(cut), callData, 0);

        uint256 ptTokenBalanceAfter = balanceOf(ptToken, sender);
        uint256 underlyingTokenBalanceAfter = balanceOf(_config.underlyingToken, sender);

        assertEq(ptTokenBalanceAfter, ptTokenBalanceBefore - _config.ptAmount);
        assertGe(underlyingTokenBalanceAfter, underlyingTokenBalanceBefore + minAmountOut);
    }
}