// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVaultT2 } from "../../../../contracts/interfaces/fluid/vaults/IFluidVaultT2.sol";
import { IFluidVaultFactory } from "../../../../contracts/interfaces/fluid/IFluidVaultFactory.sol";
import { IFluidDexResolver } from "../../../../contracts/interfaces/fluid/resolvers/IFluidDexResolver.sol";
import { FluidView } from "../../../../contracts/views/FluidView.sol";
import { FluidDexOpen } from "../../../../contracts/actions/fluid/dex/FluidDexOpen.sol";
import { FluidDexModel } from "../../../../contracts/actions/fluid/helpers/FluidDexModel.sol";
import { FluidTestHelper } from "../FluidTestHelper.t.sol";
import { SmartWallet } from "../../../utils/SmartWallet.sol";
import { TokenUtils } from "../../../../contracts/utils/TokenUtils.sol";
import { BaseTest } from "../../../utils/BaseTest.sol";
import { ActionsUtils } from "../../../utils/ActionsUtils.sol";
import { Vm } from "forge-std/Vm.sol";

contract TestFluidVaultT2Open is BaseTest, FluidTestHelper, ActionsUtils {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    FluidDexOpen cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/

    SmartWallet wallet;
    address sender;
    address walletAddr;
    IFluidVaultT2[] vaults;
    FluidView fluidView;

    struct TestConfig {
        uint256 collAmount0InUSD;
        uint256 collAmount1InUSD;
        bool takeMaxUint256CollAmount0;
        bool takeMaxUint256CollAmount1;
        uint256 borrowAmountInUSD;
        bool wrapBorrowedEth;
        bool isDirect;
    }

    struct LocalVars {
        uint256 collAmount0;
        uint256 collAmount1;
        uint256 borrowAmount;
        bool isNativeBorrow;
        bytes executeActionCallData;

        uint256 senderCollToken0BalanceBefore;
        uint256 senderCollToken1BalanceBefore;
        uint256 senderBorrowTokenBalanceBefore;
        uint256 senderCollToken0BalanceAfter;
        uint256 senderCollToken1BalanceAfter;
        uint256 senderBorrowTokenBalanceAfter;

        uint256 walletCollToken0BalanceBefore;
        uint256 walletCollToken1BalanceBefore;
        uint256 walletBorrowTokenBalanceBefore;
        uint256 walletEthBalanceBefore;
        uint256 walletCollToken0BalanceAfter;
        uint256 walletCollToken1BalanceAfter;
        uint256 walletBorrowTokenBalanceAfter;
        uint256 walletEthBalanceAfter;

        uint256 token0PerShareBefore;
        uint256 token1PerShareBefore;
        uint256 token0PerShareAfter;
        uint256 token1PerShareAfter;

        FluidView.UserPosition userPositionAfter;

        uint256 createdNft;
        FluidDexModel.SupplyVariableData shareVariableData;
        uint256 shares;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new FluidDexOpen();

        vaults = getT2Vaults();
        fluidView = new FluidView();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_open_variable_position_with_coll_0() public {
        _baseTest(
            TestConfig({
                collAmount0InUSD: 30000,
                collAmount1InUSD: 0,
                takeMaxUint256CollAmount0: false,
                takeMaxUint256CollAmount1: false,
                borrowAmountInUSD: 10000,
                wrapBorrowedEth: false,
                isDirect: false
            })
        );
    }

    function test_should_open_variable_position_with_coll_1() public {
        _baseTest(
            TestConfig({
                collAmount0InUSD: 0,
                collAmount1InUSD: 30000,
                takeMaxUint256CollAmount0: false,
                takeMaxUint256CollAmount1: false,
                borrowAmountInUSD: 10000,
                wrapBorrowedEth: false,
                isDirect: false
            })
        );
    }

    function test_should_open_variable_position_with_both_coll() public {
        _baseTest(
            TestConfig({
                collAmount0InUSD: 30000,
                collAmount1InUSD: 20000,
                takeMaxUint256CollAmount0: false,
                takeMaxUint256CollAmount1: false,
                borrowAmountInUSD: 12000,
                wrapBorrowedEth: false,
                isDirect: false
            })
        );
    }

    function test_should_open_variable_position_only_supply() public {
        _baseTest(
            TestConfig({
                collAmount0InUSD: 11000,
                collAmount1InUSD: 5000,
                takeMaxUint256CollAmount0: false,
                takeMaxUint256CollAmount1: false,
                borrowAmountInUSD: 0,
                wrapBorrowedEth: false,
                isDirect: false
            })
        );
    }

    function test_should_open_variable_position_action_direct() public {
        _baseTest(
            TestConfig({
                collAmount0InUSD: 30000,
                collAmount1InUSD: 0,
                takeMaxUint256CollAmount0: false,
                takeMaxUint256CollAmount1: false,
                borrowAmountInUSD: 10000,
                wrapBorrowedEth: false,
                isDirect: true
            })
        );
    }

    function test_should_open_variable_position_with_coll_0_maxUint256() public {
        _baseTest(
            TestConfig({
                collAmount0InUSD: 30000,
                collAmount1InUSD: 0,
                takeMaxUint256CollAmount0: true,
                takeMaxUint256CollAmount1: false,
                borrowAmountInUSD: 10000,
                wrapBorrowedEth: false,
                isDirect: false
            })
        );
    }

    function test_should_open_variable_position_with_coll_1_maxUint256() public {
        _baseTest(
            TestConfig({
                collAmount0InUSD: 30000,
                collAmount1InUSD: 25000,
                takeMaxUint256CollAmount0: false,
                takeMaxUint256CollAmount1: true,
                borrowAmountInUSD: 10000,
                wrapBorrowedEth: false,
                isDirect: false
            })
        );
    }

    function test_should_open_variable_position_with_borrow_eth_wrap() public {
        _baseTest(
            TestConfig({
                collAmount0InUSD: 30000,
                collAmount1InUSD: 0,
                takeMaxUint256CollAmount0: false,
                takeMaxUint256CollAmount1: false,
                borrowAmountInUSD: 10000,
                wrapBorrowedEth: true,
                isDirect: false
            })
        );
    }

    function _baseTest(
        TestConfig memory _config        
    ) internal {
        for (uint256 i = 0; i < vaults.length; ++i) {
            FluidView.VaultData memory vaultData = fluidView.getVaultData(address(vaults[i]));
            LocalVars memory vars;

            // Handle collateral 0 setup for variable open.
            {
                bool isNativeColl0 = vaultData.supplyToken0 == TokenUtils.ETH_ADDR;
                vaultData.supplyToken0 = isNativeColl0 ? TokenUtils.WETH_ADDR : vaultData.supplyToken0;
                if (_config.collAmount0InUSD > 0) {
                    vars.collAmount0 = amountInUSDPrice(vaultData.supplyToken0, _config.collAmount0InUSD);
                }
                give(vaultData.supplyToken0, sender, vars.collAmount0);
                approveAsSender(sender, vaultData.supplyToken0, walletAddr, vars.collAmount0);
            }
            // Handle collateral 1 setup for variable open.
            {
                bool isNativeColl1 = vaultData.supplyToken1 == TokenUtils.ETH_ADDR;
                vaultData.supplyToken1 = isNativeColl1 ? TokenUtils.WETH_ADDR : vaultData.supplyToken1;
                if (_config.collAmount1InUSD > 0) {
                    vars.collAmount1 = amountInUSDPrice(vaultData.supplyToken1, _config.collAmount1InUSD);
                }
                give(vaultData.supplyToken1, sender, vars.collAmount1);
                approveAsSender(sender, vaultData.supplyToken1, walletAddr, vars.collAmount1);
            }
            // Estimate shares.
            {
                vars.shares = IFluidDexResolver(FLUID_DEX_RESOLVER).estimateDeposit(
                    vaultData.dexSupplyData.dexPool,
                    vars.collAmount0,
                    vars.collAmount1,
                    1 /* minCollShares */
                );
                // Slightly reduce shares.
                // For variable share type, this means we expect at least this amount of shares.
                vars.shares = vars.shares * 100 / 101;
            }
            // Validate shares supply limit.
            {
                if (vaultData.dexSupplyData.maxSupplyShares  < vaultData.dexSupplyData.totalSupplyShares + vars.shares) {
                    string memory log = "Skipping smart coll vault due to supply limit reached";
                    emit log_string(log);
                    continue;
                }
            }
            // Handle borrow setup.
            {
                vars.isNativeBorrow = vaultData.borrowToken0 == TokenUtils.ETH_ADDR;
                vars.borrowAmount = _config.borrowAmountInUSD != 0
                    ? amountInUSDPrice(
                        vars.isNativeBorrow ? TokenUtils.WETH_ADDR : vaultData.borrowToken0, _config.borrowAmountInUSD
                    )
                    : 0;    
            }
            // Encode call.
            {
                vars.shareVariableData = FluidDexModel.SupplyVariableData({
                    collAmount0: _config.takeMaxUint256CollAmount0 ? type(uint256).max : vars.collAmount0,
                    collAmount1: _config.takeMaxUint256CollAmount1 ? type(uint256).max : vars.collAmount1,
                    minCollShares: vars.shares
                });

                vars.executeActionCallData = executeActionCalldata(
                    fluidDexOpenEncode(
                        address(vaults[i]),
                        sender, /* from */
                        sender, /* to */
                        0, /* supplyAmount - Only used for T1 vaults */
                        vars.shareVariableData,
                        vars.borrowAmount,
                        FluidDexModel.BorrowVariableData(0, 0, 0), /* only used for T3 and T4 vaults */
                        _config.wrapBorrowedEth
                    ),
                    _config.isDirect
                );
            }
            // Take snapshot before action execution.
            {
                vars.senderCollToken0BalanceBefore = balanceOf(vaultData.supplyToken0, sender);
                vars.senderCollToken1BalanceBefore = balanceOf(vaultData.supplyToken1, sender);
                vars.senderBorrowTokenBalanceBefore = vars.isNativeBorrow 
                    ? (
                        _config.wrapBorrowedEth ? balanceOf(TokenUtils.WETH_ADDR, sender) : address(sender).balance
                    )
                    : balanceOf(vaultData.borrowToken0, sender);

                vars.walletCollToken0BalanceBefore = balanceOf(vaultData.supplyToken0, walletAddr);
                vars.walletCollToken1BalanceBefore = balanceOf(vaultData.supplyToken1, walletAddr);
                vars.walletBorrowTokenBalanceBefore = vars.isNativeBorrow
                    ? balanceOf(TokenUtils.WETH_ADDR, walletAddr)
                    : balanceOf(vaultData.borrowToken0, walletAddr);
                vars.walletEthBalanceBefore = address(walletAddr).balance;

                vars.token0PerShareBefore = vaultData.dexSupplyData.token0PerSupplyShare;
                vars.token1PerShareBefore = vaultData.dexSupplyData.token1PerSupplyShare;
            }
            // Execute action.
            {
                vm.recordLogs();

                wallet.execute(address(cut), vars.executeActionCallData, 0);

                Vm.Log[] memory logs = vm.getRecordedLogs();

                for (uint256 j = 0; j < logs.length; ++j) {
                    if (logs[j].topics[0] == IFluidVaultFactory.NewPositionMinted.selector) {
                        vars.createdNft = uint256(logs[j].topics[3]);
                        break;
                    }
                }
            }
            // Take snapshot after action execution.
            {
                vars.senderCollToken0BalanceAfter = balanceOf(vaultData.supplyToken0, sender);
                vars.senderCollToken1BalanceAfter = balanceOf(vaultData.supplyToken1, sender);
                vars.senderBorrowTokenBalanceAfter = vars.isNativeBorrow 
                    ? (
                        _config.wrapBorrowedEth ? balanceOf(TokenUtils.WETH_ADDR, sender) : address(sender).balance 
                    ) 
                    : balanceOf(vaultData.borrowToken0, sender);  

                vars.walletCollToken0BalanceAfter = balanceOf(vaultData.supplyToken0, walletAddr);
                vars.walletCollToken1BalanceAfter = balanceOf(vaultData.supplyToken1, walletAddr);
                vars.walletBorrowTokenBalanceAfter = vars.isNativeBorrow
                    ? balanceOf(TokenUtils.WETH_ADDR, walletAddr)
                    : balanceOf(vaultData.borrowToken0, walletAddr);
                vars.walletEthBalanceAfter = address(walletAddr).balance;

                (vars.token0PerShareAfter, vars.token1PerShareAfter, , ) = fluidView.getDexShareRates(address(vaults[i]));

                (vars.userPositionAfter, ) = fluidView.getPositionByNftId(vars.createdNft);
            }
            // Assertions.
            {   
                // Verify no dust left on wallet.
                assertEq(vars.walletCollToken0BalanceAfter, vars.walletCollToken0BalanceBefore);
                assertEq(vars.walletCollToken1BalanceAfter, vars.walletCollToken1BalanceBefore);
                assertEq(vars.walletBorrowTokenBalanceAfter, vars.walletBorrowTokenBalanceBefore);
                assertEq(vars.walletEthBalanceAfter, vars.walletEthBalanceBefore);

                assertTrue(vars.createdNft != 0);
                assertEq(vars.senderBorrowTokenBalanceAfter, vars.senderBorrowTokenBalanceBefore + vars.borrowAmount);

                assertEq(vars.senderCollToken0BalanceAfter, vars.senderCollToken0BalanceBefore - vars.collAmount0);
                assertEq(vars.senderCollToken1BalanceAfter, vars.senderCollToken1BalanceBefore - vars.collAmount1);    
                
                assertEq(vars.userPositionAfter.owner, walletAddr);
                assertEq(vars.userPositionAfter.isLiquidated, false);
                assertEq(vars.userPositionAfter.isSupplyPosition, vars.borrowAmount == 0);
            }
            // Log data
            {
                emit log_named_uint("token0PerShareBefore", vars.token0PerShareBefore);
                emit log_named_uint("token1PerShareBefore", vars.token1PerShareBefore);
                emit log_named_uint("token0PerShareAfter", vars.token0PerShareAfter);
                emit log_named_uint("token1PerShareAfter", vars.token1PerShareAfter);
                emit log_named_uint("estimatedShares", vars.shares);
                emit log_named_uint("actualShares", vars.userPositionAfter.supply);
            }
        }
    }
}