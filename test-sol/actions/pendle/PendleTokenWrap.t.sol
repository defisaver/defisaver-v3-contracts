// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IPendleMarket } from "../../../contracts/interfaces/pendle/IPendleMarket.sol";
import { PendleTokenWrap } from "contracts/actions/pendle/PendleTokenWrap.sol";
import { IERC20 } from "../../../contracts/interfaces/IERC20.sol";

import { BaseTest } from "../../utils/BaseTest.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { ActionsUtils } from "../../utils/ActionsUtils.sol";

contract TestPendleTokenWrap is BaseTest, ActionsUtils {
    
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    PendleTokenWrap cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;

    struct TestConfig {
        address market;
        address underlyingToken;
        uint256 underlyingAmount;
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
        forkMainnet("PendleTokenWrap");
        
        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new PendleTokenWrap();

        // PT eUSDE 29May2025
        markets.push(PendleMarketInfo({
            market: 0x85667e484a32d884010Cf16427D90049CCf46e97,
            underlyingToken: 0x90D2af7d622ca3141efA4d8f1F24d86E5974Cc8F
        }));

        // PT sUSDE  29May2025
        markets.push(PendleMarketInfo({
            market: 0xB162B764044697cf03617C2EFbcB1f42e31E4766,
            underlyingToken: 0x9D39A5DE30e57443BfF2A8307A4256c8797A3497
        }));

        // PT Level USD 29May2025
        markets.push(PendleMarketInfo({
            market: 0xE45d2CE15aBbA3c67b9fF1E7A69225C855d3DA82,
            underlyingToken: 0x7C1156E515aA1A2E851674120074968C905aAF37
        }));

        // PT USD0++ 26May2025
        markets.push(PendleMarketInfo({
            market: 0x048680F64d6DFf1748ba6D9a01F578433787e24B,
            underlyingToken: 0x35D8949372D46B7a3D5A56006AE77B215fc69bC0
        }));
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_pendle_wrap() public {
        for (uint256 i = 0; i < markets.length; i++) {
            uint256 underlyingDecimals = IERC20(markets[i].underlyingToken).decimals();
            _baseTest(TestConfig({
                market: markets[i].market,
                underlyingToken: markets[i].underlyingToken,
                underlyingAmount: 432913 * 10 ** underlyingDecimals,
                isDirect: false
            }));
        }
    }

    function test_pendle_wrap_action_direct() public {
        for (uint256 i = 0; i < markets.length; i++) {
            uint256 underlyingDecimals = IERC20(markets[i].underlyingToken).decimals();
            _baseTest(TestConfig({
                market: markets[i].market,
                underlyingToken: markets[i].underlyingToken,
                underlyingAmount: 100000 * 10 ** underlyingDecimals,
                isDirect: true
            }));
        }
    }

    function _baseTest(
        TestConfig memory _config
    ) internal {
        (, address ptToken, ) = IPendleMarket(_config.market).readTokens();

        give(_config.underlyingToken, sender, _config.underlyingAmount);
        approveAsSender(sender, _config.underlyingToken, walletAddr, _config.underlyingAmount);

        bytes memory callData = executeActionCalldata(
            pendleTokenWrapEncode(
                _config.market,
                _config.underlyingToken,
                sender,
                sender,
                _config.underlyingAmount,
                1 /* minPtOut */
            ),
            _config.isDirect
        );

        uint256 ptTokenBalanceBefore = balanceOf(ptToken, sender);
        uint256 underlyingTokenBalanceBefore = balanceOf(_config.underlyingToken, sender);

        wallet.logExecute(address(cut), callData, 0);

        uint256 ptTokenBalanceAfter = balanceOf(ptToken, sender);
        uint256 underlyingTokenBalanceAfter = balanceOf(_config.underlyingToken, sender);

        assertEq(underlyingTokenBalanceAfter, underlyingTokenBalanceBefore - _config.underlyingAmount);
        assertGt(ptTokenBalanceAfter, ptTokenBalanceBefore);
    }
}
