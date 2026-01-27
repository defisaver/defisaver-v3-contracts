// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    IFluidVaultResolver
} from "../../../../contracts/interfaces/protocols/fluid/resolvers/IFluidVaultResolver.sol";
import { FluidView } from "../../../../contracts/views/FluidView.sol";
import { FluidDexSupply } from "../../../../contracts/actions/fluid/dex/FluidDexSupply.sol";
import { FluidDexOpen } from "../../../../contracts/actions/fluid/dex/FluidDexOpen.sol";
import { FluidDexModel } from "../../../../contracts/actions/fluid/helpers/FluidDexModel.sol";
import { SmartWallet } from "../../../utils/SmartWallet.sol";
import { FluidTestBase } from "../FluidTestBase.t.sol";

contract TestFluidDexSupply is FluidTestBase {
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    FluidDexSupply cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/

    SmartWallet wallet;
    address sender;
    address walletAddr;

    address[] t2Vaults;
    address[] t4Vaults;

    FluidView fluidView;
    FluidDexOpen fluidDexOpen;

    bool[] t2VaultsSelected;

    struct TestConfig {
        uint256 collAmount0InUSD;
        uint256 collAmount1InUSD;
        bool takeMaxUint256CollAmount0;
        bool takeMaxUint256CollAmount1;
        bool isDirect;
    }

    struct LocalVars {
        uint256 collAmount0;
        uint256 collAmount1;
        bytes executeActionCallData;
        uint256 senderCollToken0BalanceBefore;
        uint256 senderCollToken1BalanceBefore;
        uint256 senderCollToken0BalanceAfter;
        uint256 senderCollToken1BalanceAfter;
        uint256 walletCollToken0BalanceBefore;
        uint256 walletCollToken1BalanceBefore;
        uint256 walletEthBalanceBefore;
        uint256 walletCollToken0BalanceAfter;
        uint256 walletCollToken1BalanceAfter;
        uint256 walletEthBalanceAfter;
        FluidView.VaultData vaultData;
        IFluidVaultResolver.UserPosition userPositionBefore;
        IFluidVaultResolver.UserPosition userPositionAfter;
        FluidDexModel.SupplyVariableData shareVariableData;
        uint256 shares;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("FluidDexSupply");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new FluidDexSupply();

        t2Vaults = getT2Vaults();
        t4Vaults = getT4Vaults();

        fluidView = new FluidView();
        fluidDexOpen = new FluidDexOpen();

        t2VaultsSelected = new bool[](2);
        t2VaultsSelected[0] = true;
        t2VaultsSelected[1] = false;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_supply_variable_position_with_coll_0() public {
        for (uint256 i = 0; i < t2VaultsSelected.length; ++i) {
            _baseTest(
                TestConfig({
                    collAmount0InUSD: 30_000,
                    collAmount1InUSD: 0,
                    takeMaxUint256CollAmount0: false,
                    takeMaxUint256CollAmount1: false,
                    isDirect: false
                }),
                t2VaultsSelected[i]
            );
        }
    }

    function test_should_supply_variable_position_with_coll_1() public {
        for (uint256 i = 0; i < t2VaultsSelected.length; ++i) {
            _baseTest(
                TestConfig({
                    collAmount0InUSD: 0,
                    collAmount1InUSD: 30_000,
                    takeMaxUint256CollAmount0: false,
                    takeMaxUint256CollAmount1: false,
                    isDirect: false
                }),
                t2VaultsSelected[i]
            );
        }
    }

    function test_should_supply_variable_position_with_both_coll() public {
        for (uint256 i = 0; i < t2VaultsSelected.length; ++i) {
            _baseTest(
                TestConfig({
                    collAmount0InUSD: 30_000,
                    collAmount1InUSD: 20_000,
                    takeMaxUint256CollAmount0: false,
                    takeMaxUint256CollAmount1: false,
                    isDirect: false
                }),
                t2VaultsSelected[i]
            );
        }
    }

    function test_should_supply_variable_position_only_supply() public {
        for (uint256 i = 0; i < t2VaultsSelected.length; ++i) {
            _baseTest(
                TestConfig({
                    collAmount0InUSD: 11_000,
                    collAmount1InUSD: 5000,
                    takeMaxUint256CollAmount0: false,
                    takeMaxUint256CollAmount1: false,
                    isDirect: false
                }),
                t2VaultsSelected[i]
            );
        }
    }

    function test_should_supply_variable_position_action_direct() public {
        for (uint256 i = 0; i < t2VaultsSelected.length; ++i) {
            _baseTest(
                TestConfig({
                    collAmount0InUSD: 30_000,
                    collAmount1InUSD: 0,
                    takeMaxUint256CollAmount0: false,
                    takeMaxUint256CollAmount1: false,
                    isDirect: true
                }),
                t2VaultsSelected[i]
            );
        }
    }

    function test_should_open_variable_position_with_coll_0_maxUint256() public {
        for (uint256 i = 0; i < t2VaultsSelected.length; ++i) {
            _baseTest(
                TestConfig({
                    collAmount0InUSD: 30_000,
                    collAmount1InUSD: 0,
                    takeMaxUint256CollAmount0: true,
                    takeMaxUint256CollAmount1: false,
                    isDirect: false
                }),
                t2VaultsSelected[i]
            );
        }
    }

    function test_should_open_variable_position_with_coll_1_maxUint256() public {
        for (uint256 i = 0; i < t2VaultsSelected.length; ++i) {
            _baseTest(
                TestConfig({
                    collAmount0InUSD: 30_000,
                    collAmount1InUSD: 25_000,
                    takeMaxUint256CollAmount0: false,
                    takeMaxUint256CollAmount1: true,
                    isDirect: false
                }),
                t2VaultsSelected[i]
            );
        }
    }

    function _baseTest(TestConfig memory _config, bool _t2VaultsSelected) internal {
        address[] memory vaults = _t2VaultsSelected ? t2Vaults : t4Vaults;

        for (uint256 i = 0; i < vaults.length; ++i) {
            uint256 nftId = _t2VaultsSelected
                ? executeFluidVaultT2Open(
                    vaults[i],
                    20_000, /* initial coll amount 0 in usd */
                    10_000, /* initial coll amount 1 in usd */
                    0, /* initial borrow amount in usd */
                    wallet,
                    address(fluidDexOpen)
                )
                : executeFluidVaultT4Open(
                    vaults[i],
                    20_000, /* initial coll amount 0 in usd */
                    10_000, /* initial coll amount 1 in usd */
                    0, /* initial borrow amount 0 in usd */
                    0, /* initial borrow amount 1 in usd */
                    wallet,
                    address(fluidDexOpen)
                );

            if (nftId == 0) {
                logSkipTestBecauseOfOpen(vaults[i]);
                continue;
            }

            FluidView.VaultData memory vaultData = fluidView.getVaultData(address(vaults[i]));
            LocalVars memory vars;

            (vaultData.supplyToken0, vars.collAmount0) = giveAndApproveToken(
                vaultData.supplyToken0, sender, walletAddr, _config.collAmount0InUSD
            );

            (vaultData.supplyToken1, vars.collAmount1) = giveAndApproveToken(
                vaultData.supplyToken1, sender, walletAddr, _config.collAmount1InUSD
            );

            vars.shares = estimateDepositShares(
                vaultData.dexSupplyData.dexPool, vars.collAmount0, vars.collAmount1
            );

            if (supplyLimitReached(vaultData.dexSupplyData, vars.shares)) {
                logSupplyLimitReached(address(vaults[i]));
                continue;
            }

            // Encode call.
            vars.shareVariableData = FluidDexModel.SupplyVariableData({
                collAmount0: _config.takeMaxUint256CollAmount0
                    ? type(uint256).max
                    : vars.collAmount0,
                collAmount1: _config.takeMaxUint256CollAmount1
                    ? type(uint256).max
                    : vars.collAmount1,
                minCollShares: vars.shares
            });

            vars.executeActionCallData = executeActionCalldata(
                fluidDexSupplyEncode(
                    address(vaults[i]),
                    sender,
                    nftId,
                    0, /* supplyAmount - Only used for T1 vaults */
                    vars.shareVariableData
                ),
                _config.isDirect
            );

            // Take snapshot before action execution.
            vars.senderCollToken0BalanceBefore = balanceOf(vaultData.supplyToken0, sender);
            vars.senderCollToken1BalanceBefore = balanceOf(vaultData.supplyToken1, sender);
            vars.walletCollToken0BalanceBefore = balanceOf(vaultData.supplyToken0, walletAddr);
            vars.walletCollToken1BalanceBefore = balanceOf(vaultData.supplyToken1, walletAddr);
            vars.walletEthBalanceBefore = address(walletAddr).balance;
            vars.userPositionBefore = fetchPositionByNftId(nftId);

            // Execute action.
            wallet.execute(address(cut), vars.executeActionCallData, 0);

            // Take snapshot after action execution.
            vars.senderCollToken0BalanceAfter = balanceOf(vaultData.supplyToken0, sender);
            vars.senderCollToken1BalanceAfter = balanceOf(vaultData.supplyToken1, sender);
            vars.walletCollToken0BalanceAfter = balanceOf(vaultData.supplyToken0, walletAddr);
            vars.walletCollToken1BalanceAfter = balanceOf(vaultData.supplyToken1, walletAddr);
            vars.walletEthBalanceAfter = address(walletAddr).balance;
            vars.userPositionAfter = fetchPositionByNftId(nftId);

            // Assertions.
            // Verify no dust left on wallet.
            assertEq(vars.walletCollToken0BalanceAfter, vars.walletCollToken0BalanceBefore);
            assertEq(vars.walletCollToken1BalanceAfter, vars.walletCollToken1BalanceBefore);
            assertEq(vars.walletEthBalanceAfter, vars.walletEthBalanceBefore);

            assertEq(
                vars.senderCollToken0BalanceAfter,
                vars.senderCollToken0BalanceBefore - vars.collAmount0
            );
            assertEq(
                vars.senderCollToken1BalanceAfter,
                vars.senderCollToken1BalanceBefore - vars.collAmount1
            );

            assertEq(vars.userPositionAfter.owner, walletAddr);
            assertEq(vars.userPositionAfter.isLiquidated, false);
            assertTrue(vars.userPositionAfter.supply > vars.userPositionBefore.supply);
        }
    }
}
