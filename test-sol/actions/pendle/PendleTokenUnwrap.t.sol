// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IPendleMarket } from "../../../contracts/interfaces/pendle/IPendleMarket.sol";
import { PendleTokenUnwrap } from "contracts/actions/pendle/PendleTokenUnwrap.sol";
import { IERC20 } from "../../../contracts/interfaces/IERC20.sol";

import { BaseTest } from "../../utils/BaseTest.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { ActionsUtils } from "../../utils/ActionsUtils.sol";

contract TestPendleTokenUnwrap is BaseTest, ActionsUtils {
    
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    PendleTokenUnwrap cut;

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
        forkMainnet("PendleTokenUnwrap");
        
        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new PendleTokenUnwrap();

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

        // PT Aave Ethereum USDC 26Jun2025
        markets.push(PendleMarketInfo({
            market: 0x8539B41CA14148d1F7400d399723827a80579414,
            underlyingToken: 0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c
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
    function test_pendle_unwrap() public {
        for (uint256 i = 0; i < markets.length; i++) {
            uint256 underlyingDecimals = IERC20(markets[i].underlyingToken).decimals();
            _baseTest(TestConfig({
                market: markets[i].market,
                underlyingToken: markets[i].underlyingToken,
                ptAmount: 10 * 10 ** underlyingDecimals,
                isDirect: false
            }));
        }
    }

    function test_pendle_unwrap_action_direct() public {
        for (uint256 i = 0; i < markets.length; i++) {
            uint256 underlyingDecimals = IERC20(markets[i].underlyingToken).decimals();
            _baseTest(TestConfig({
                market: markets[i].market,
                underlyingToken: markets[i].underlyingToken,
                ptAmount: 10 * 10 ** underlyingDecimals,
                isDirect: true
            }));
        }
    }

    function test_pendle_unwrap_with_slippage_set() public {
        for (uint256 i = 0; i < markets.length; i++) {
            uint256 underlyingDecimals = IERC20(markets[i].underlyingToken).decimals();
            _baseTest(TestConfig({
                market: markets[i].market,
                underlyingToken: markets[i].underlyingToken,
                ptAmount: 100 * 10 ** underlyingDecimals,
                isDirect: false
            }));
        }
    }

    function _baseTest(
        TestConfig memory _config
    ) internal {
        (, address ptToken, ) = IPendleMarket(_config.market).readTokens();

        give(ptToken, sender, _config.ptAmount);
        approveAsSender(sender, ptToken, walletAddr, _config.ptAmount);

        bytes memory callData = executeActionCalldata(
            pendleTokenUnwrapEncode(
                _config.market,
                _config.underlyingToken,
                sender,
                sender,
                _config.ptAmount,
                1 /* minAmountOut */
            ),
            _config.isDirect
        );

        uint256 ptTokenBalanceBefore = balanceOf(ptToken, sender);
        uint256 underlyingTokenBalanceBefore = balanceOf(_config.underlyingToken, sender);

        wallet.execute(address(cut), callData, 0);

        uint256 ptTokenBalanceAfter = balanceOf(ptToken, sender);
        uint256 underlyingTokenBalanceAfter = balanceOf(_config.underlyingToken, sender);

        assertEq(ptTokenBalanceAfter, ptTokenBalanceBefore - _config.ptAmount);
        assertGt(underlyingTokenBalanceAfter, underlyingTokenBalanceBefore);
    }
}
