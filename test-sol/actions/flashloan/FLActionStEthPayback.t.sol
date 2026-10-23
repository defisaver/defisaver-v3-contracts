// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { FLAction } from "../../../contracts/actions/flashloan/FLAction.sol";
import {
    IUniswapV3Pool
} from "../../../contracts/interfaces/protocols/uniswap/v3/IUniswapV3Pool.sol";
import { StrategyModel } from "../../../contracts/core/strategy/StrategyModel.sol";
import { FLActionTestBase } from "./FLActionTestBase.t.sol";
import { Addresses } from "../../utils/helpers/MainnetAddresses.sol";

interface IStEthPaybackToken {
    function balanceOf(address _account) external view returns (uint256);
    function sharesOf(address _account) external view returns (uint256);
    function getSharesByPooledEth(uint256 _amount) external view returns (uint256);
    function getPooledEthByShares(uint256 _shares) external view returns (uint256);
    function transfer(address _to, uint256 _amount) external returns (bool);
    function transferShares(address _to, uint256 _shares) external returns (uint256);
}

contract FLActionPaybackHarness is FLAction {
    function verifyPaybackAmount(address _token, uint256 _expectedBalance) external {
        _verifyPaybackAmount(_token, _expectedBalance);
    }
}

contract TestFLActionStEthPayback is FLActionTestBase {
    address internal constant STETH_WETH_POOL = 0x63818BbDd21E69bE108A23aC1E84cBf66399Bd7D;

    FLActionPaybackHarness internal harness;
    IStEthPaybackToken internal stEth;

    function _forkForTest() internal override {
        // Pin the share rate and use the deployed, funded FeeFaucet. stETH is never mocked.
        forkFromEnv("FLActionStEthPayback");
    }

    function setUp() public override {
        super.setUp();
        harness = new FLActionPaybackHarness();
        stEth = IStEthPaybackToken(ST_ETH_ADDR);
    }

    function test_should_accept_exact_payback_amount() public {
        if (isL2NetworkSelected()) vm.skip(true);
        _giveStEthShares(address(harness), 1 ether);
        uint256 expectedBalance = stEth.balanceOf(address(harness));
        uint256 faucetShares = stEth.sharesOf(FEE_FAUCET);

        harness.verifyPaybackAmount(ST_ETH_ADDR, expectedBalance);

        assertEq(stEth.balanceOf(address(harness)), expectedBalance);
        assertEq(stEth.sharesOf(FEE_FAUCET), faucetShares);
    }

    function test_should_cover_steth_one_wei_deficit() public {
        if (isL2NetworkSelected()) vm.skip(true);
        uint256 expectedBalance = _seedHarnessForTopUp(1) + 1;

        harness.verifyPaybackAmount(ST_ETH_ADDR, expectedBalance);

        assertEq(stEth.balanceOf(address(harness)), expectedBalance);
    }

    function test_should_cover_steth_two_wei_deficit() public {
        if (isL2NetworkSelected()) vm.skip(true);
        uint256 expectedBalance = _seedHarnessForTopUp(2) + 2;

        harness.verifyPaybackAmount(ST_ETH_ADDR, expectedBalance);

        assertEq(stEth.balanceOf(address(harness)), expectedBalance);
    }

    function test_should_keep_one_wei_surplus_when_refund_would_move_zero_shares() public {
        if (isL2NetworkSelected()) vm.skip(true);
        uint256 expectedBalance = _seedHarnessForTopUp(2) + 1;
        uint256 faucetShares = stEth.sharesOf(FEE_FAUCET);
        uint256 topUpShares = stEth.getSharesByPooledEth(2);
        assertEq(stEth.getSharesByPooledEth(1), 0);

        harness.verifyPaybackAmount(ST_ETH_ADDR, expectedBalance);

        assertEq(stEth.balanceOf(address(harness)), expectedBalance + 1);
        assertEq(stEth.sharesOf(FEE_FAUCET), faucetShares - topUpShares);

        // Demonstrate why an exact-balance check after refunding 1 wei used to revert.
        uint256 harnessShares = stEth.sharesOf(address(harness));
        vm.prank(address(harness));
        stEth.transfer(FEE_FAUCET, 1);
        assertEq(stEth.sharesOf(address(harness)), harnessShares);
        assertEq(stEth.balanceOf(address(harness)), expectedBalance + 1);
    }

    function test_should_revert_if_real_steth_top_up_is_insufficient() public {
        if (isL2NetworkSelected()) vm.skip(true);
        uint256 expectedBalance = _seedHarnessForTopUp(1) + 2;
        uint256 faucetShares = stEth.sharesOf(FEE_FAUCET);

        vm.expectRevert(FLAction.WrongPaybackAmountError.selector);
        harness.verifyPaybackAmount(ST_ETH_ADDR, expectedBalance);

        assertEq(stEth.sharesOf(FEE_FAUCET), faucetShares);
    }

    function test_should_revert_steth_deficit_greater_than_two_wei() public {
        if (isL2NetworkSelected()) vm.skip(true);
        _giveStEthShares(address(harness), 1 ether);
        uint256 expectedBalance = stEth.balanceOf(address(harness)) + 3;

        vm.expectRevert(FLAction.WrongPaybackAmountError.selector);
        harness.verifyPaybackAmount(ST_ETH_ADDR, expectedBalance);
    }

    function test_should_revert_steth_surplus_before_top_up() public {
        if (isL2NetworkSelected()) vm.skip(true);
        _giveStEthShares(address(harness), 1 ether);
        uint256 expectedBalance = stEth.balanceOf(address(harness)) - 1;

        vm.expectRevert(FLAction.WrongPaybackAmountError.selector);
        harness.verifyPaybackAmount(ST_ETH_ADDR, expectedBalance);
    }

    function test_should_revert_non_steth_deficit() public {
        if (isL2NetworkSelected()) vm.skip(true);
        _giveToken(Addresses.WETH_ADDR, address(harness), 1 ether);

        vm.expectRevert(FLAction.WrongPaybackAmountError.selector);
        harness.verifyPaybackAmount(Addresses.WETH_ADDR, 1 ether + 1);
    }

    function test_should_revert_non_steth_surplus() public {
        if (isL2NetworkSelected()) vm.skip(true);
        _giveToken(Addresses.WETH_ADDR, address(harness), 1 ether);

        vm.expectRevert(FLAction.WrongPaybackAmountError.selector);
        harness.verifyPaybackAmount(Addresses.WETH_ADDR, 1 ether - 1);
    }

    function test_should_repay_real_steth_uniswap_flashloan_with_rounding_surplus() public {
        if (isL2NetworkSelected()) vm.skip(true);
        uint256 poolFee = IUniswapV3Pool(STETH_WETH_POOL).fee();
        uint256 amount = _loanAmountWithRoundingSurplus(poolFee);
        uint256 fee = _uniV3Fee(amount, poolFee);
        _giveStEthShares(walletAddr, 1 ether);

        StrategyModel.Recipe memory recipe =
            _uniV3FLRecipe(ST_ETH_ADDR, Addresses.WETH_ADDR, STETH_WETH_POOL, amount, 0);
        // Return exactly the fee-inclusive piped value, rather than the wallet's full balance.
        recipe.paramMapping[1][4] = 1;
        uint256 poolBalance = stEth.balanceOf(STETH_WETH_POOL);
        uint256 faucetShares = stEth.sharesOf(FEE_FAUCET);

        _executeRecipe(recipe);

        assertGe(stEth.balanceOf(STETH_WETH_POOL), poolBalance + fee);
        assertEq(stEth.balanceOf(flActionAddr), 1);
        assertEq(stEth.sharesOf(FEE_FAUCET), faucetShares - stEth.getSharesByPooledEth(2));

        // The retained dust must not prevent a subsequent flash loan.
        poolBalance = stEth.balanceOf(STETH_WETH_POOL);
        _executeRecipe(recipe);
        assertGe(stEth.balanceOf(STETH_WETH_POOL), poolBalance + fee);
    }

    function _giveStEthShares(address _to, uint256 _shares) internal {
        vm.prank(Addresses.WSTETH_ADDR);
        stEth.transferShares(_to, _shares);
    }

    function _seedHarnessForTopUp(uint256 _balanceIncrease) internal returns (uint256 balance) {
        uint256 topUpShares = stEth.getSharesByPooledEth(2);
        for (uint256 shares = 1 ether; shares < 1 ether + 100; ++shares) {
            balance = stEth.getPooledEthByShares(shares);
            if (stEth.getPooledEthByShares(shares + topUpShares) - balance == _balanceIncrease) {
                _giveStEthShares(address(harness), shares);
                return balance;
            }
        }
        revert("No matching stETH rounding fixture");
    }

    function _loanAmountWithRoundingSurplus(uint256 _poolFee) internal view returns (uint256) {
        uint256 topUpShares = stEth.getSharesByPooledEth(2);
        for (uint256 amount = 1 ether; amount < 1 ether + 100; ++amount) {
            uint256 expectedBalance = amount + _uniV3Fee(amount, _poolFee);
            uint256 repaymentShares = stEth.getSharesByPooledEth(expectedBalance);
            if (
                stEth.getPooledEthByShares(repaymentShares) == expectedBalance - 1
                    && stEth.getPooledEthByShares(repaymentShares + topUpShares)
                        == expectedBalance + 1
            ) return amount;
        }
        revert("No matching stETH flash loan fixture");
    }
}
