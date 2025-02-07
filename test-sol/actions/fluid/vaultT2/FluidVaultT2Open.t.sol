// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVaultT2 } from "../../../../contracts/interfaces/fluid/IFluidVaultT2.sol";
import { IFluidVaultResolver } from "../../../../contracts/interfaces/fluid/IFluidVaultResolver.sol";
import { IFluidDexResolver } from "../../../../contracts/interfaces/fluid/IFluidDexResolver.sol";
import { IFluidVaultFactory } from "../../../../contracts/interfaces/fluid/IFluidVaultFactory.sol";
import { FluidVaultT2Open } from "../../../../contracts/actions/fluid/vaultT2/FluidVaultT2Open.sol";
import { FluidSupplyDexCommon } from "../../../../contracts/actions/fluid/vaultT2/shared/FluidSupplyDexCommon.sol";
import { FluidTestHelper } from "../FluidTestHelper.t.sol";
import { SmartWallet } from "../../../utils/SmartWallet.sol";
import { TokenUtils } from "../../../../contracts/utils/TokenUtils.sol";
import { BaseTest } from "../../../utils/BaseTest.sol";
import { ActionsUtils } from "../../../utils/ActionsUtils.sol";
import { Vm } from "forge-std/Vm.sol";
import { console } from "forge-std/console.sol";

contract TestFluidVaultT2Open is BaseTest, FluidTestHelper, ActionsUtils {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    FluidVaultT2Open cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/

    SmartWallet wallet;
    address sender;
    address walletAddr;
    IFluidVaultT2[] vaults;

    struct TestConfig {
        FluidSupplyDexCommon.ShareType shareType;
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
        uint256 createdNft;
        uint256 exactPulledCollAmount0;
        uint256 exactPulledCollAmount1;
        FluidSupplyDexCommon.SupplyExactData shareExactData;
        FluidSupplyDexCommon.SupplyVariableData shareVariableData;
        IFluidDexResolver.DexEntireData dexData;
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

        cut = new FluidVaultT2Open();

        vaults = getT2Vaults();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_open_variable_position_with_coll_0() public {
        _baseTest(
            TestConfig({
                shareType: FluidSupplyDexCommon.ShareType.VARIABLE,
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
                shareType: FluidSupplyDexCommon.ShareType.VARIABLE,
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
                shareType: FluidSupplyDexCommon.ShareType.VARIABLE,
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
                shareType: FluidSupplyDexCommon.ShareType.VARIABLE,
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
                shareType: FluidSupplyDexCommon.ShareType.VARIABLE,
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
                shareType: FluidSupplyDexCommon.ShareType.VARIABLE,
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
                shareType: FluidSupplyDexCommon.ShareType.VARIABLE,
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
                shareType: FluidSupplyDexCommon.ShareType.VARIABLE,
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
    function test_should_open_exact_position() public {
        _baseTest(
            TestConfig({
                shareType: FluidSupplyDexCommon.ShareType.EXACT,
                collAmount0InUSD: 25000,
                collAmount1InUSD: 5000,
                takeMaxUint256CollAmount0: false,
                takeMaxUint256CollAmount1: false,
                borrowAmountInUSD: 10000,
                wrapBorrowedEth: false,
                isDirect: false
            })
        );
    }
    function test_should_open_exact_position_only_supply() public {
        _baseTest(
            TestConfig({
                shareType: FluidSupplyDexCommon.ShareType.EXACT,
                collAmount0InUSD: 21111,
                collAmount1InUSD: 4342,
                takeMaxUint256CollAmount0: false,
                takeMaxUint256CollAmount1: false,
                borrowAmountInUSD: 0,
                wrapBorrowedEth: false,
                isDirect: false
            })
        );
    }
    function test_should_open_exact_position_action_direct() public {
        _baseTest(
            TestConfig({
                shareType: FluidSupplyDexCommon.ShareType.EXACT,
                collAmount0InUSD: 25000,
                collAmount1InUSD: 5000,
                takeMaxUint256CollAmount0: false,
                takeMaxUint256CollAmount1: false,
                borrowAmountInUSD: 10000,
                wrapBorrowedEth: false,
                isDirect: true
            })
        );
    }
    function test_should_open_exact_position_with_coll_0_maxUint256() public {
        _baseTest(
            TestConfig({
                shareType: FluidSupplyDexCommon.ShareType.EXACT,
                collAmount0InUSD: 25000,
                collAmount1InUSD: 5000,
                takeMaxUint256CollAmount0: true,
                takeMaxUint256CollAmount1: false,
                borrowAmountInUSD: 10000,
                wrapBorrowedEth: false,
                isDirect: false
            })
        );
    }
    function test_should_open_exact_position_with_coll_1_maxUint256() public {
        _baseTest(
            TestConfig({
                shareType: FluidSupplyDexCommon.ShareType.EXACT,
                collAmount0InUSD: 25000,
                collAmount1InUSD: 5000,
                takeMaxUint256CollAmount0: false,
                takeMaxUint256CollAmount1: true,
                borrowAmountInUSD: 10000,
                wrapBorrowedEth: false,
                isDirect: false
            })
        );
    }
    function test_should_open_exact_position_with_borrow_eth_wrap() public {
        _baseTest(
            TestConfig({
                shareType: FluidSupplyDexCommon.ShareType.EXACT,
                collAmount0InUSD: 25000,
                collAmount1InUSD: 5000,
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
            IFluidVaultT2.ConstantViews memory constants = vaults[i].constantsView();
            LocalVars memory vars;

            // Handle collateral 0 setup for variable open.
            {
                bool isNativeColl0 = constants.supplyToken.token0 == TokenUtils.ETH_ADDR;
                constants.supplyToken.token0 = isNativeColl0 ? TokenUtils.WETH_ADDR : constants.supplyToken.token0;
                if (_config.collAmount0InUSD > 0) {
                    vars.collAmount0 = amountInUSDPrice(constants.supplyToken.token0, _config.collAmount0InUSD);
                }
                if (_config.shareType == FluidSupplyDexCommon.ShareType.VARIABLE) {
                    give(constants.supplyToken.token0, sender, vars.collAmount0);
                    approveAsSender(sender, constants.supplyToken.token0, walletAddr, vars.collAmount0);
                }
            }
            // Handle collateral 1 setup for variable open.
            {
                bool isNativeColl1 = constants.supplyToken.token1 == TokenUtils.ETH_ADDR;
                constants.supplyToken.token1 = isNativeColl1 ? TokenUtils.WETH_ADDR : constants.supplyToken.token1;
                if (_config.collAmount1InUSD > 0) {
                    vars.collAmount1 = amountInUSDPrice(constants.supplyToken.token1, _config.collAmount1InUSD);
                }
                if (_config.shareType == FluidSupplyDexCommon.ShareType.VARIABLE) {
                    give(constants.supplyToken.token1, sender, vars.collAmount1);
                    approveAsSender(sender, constants.supplyToken.token1, walletAddr, vars.collAmount1);
                }
            }
            // Estimate shares.
            {
                vars.shares = IFluidDexResolver(FLUID_DEX_RESOLVER).estimateDeposit(
                    constants.supply,
                    vars.collAmount0,
                    vars.collAmount1,
                    1 /* minCollShares */
                );
                // For exact share type, calculate exact coll amounts.
                if (_config.shareType == FluidSupplyDexCommon.ShareType.EXACT) {
                    (vars.collAmount0, vars.collAmount1) = IFluidDexResolver(FLUID_DEX_RESOLVER).estimateDepositPerfect(
                        constants.supply,
                        vars.shares,
                        vars.collAmount0, /* unused in estimation */
                        vars.collAmount1 /* unused in estimation */
                    );
                    // Fund user with exact coll amounts.
                    give(constants.supplyToken.token0, sender, vars.collAmount0);
                    give(constants.supplyToken.token1, sender, vars.collAmount1);
                    // Approve wallet to pull exact coll amounts.
                    approveAsSender(sender, constants.supplyToken.token0, walletAddr, vars.collAmount0);
                    approveAsSender(sender, constants.supplyToken.token1, walletAddr, vars.collAmount1);
                }
                // Slightly reduce shares.
                // For variable share type, this means we expect at least this amount of shares.
                // For exact share type, this means we will pull slightly less collateral than exact coll amounts.
                vars.shares = vars.shares * 100 / 101;
            }
            // Validate shares supply limit.
            {
                vars.dexData = IFluidDexResolver(FLUID_DEX_RESOLVER).getDexEntireData(constants.supply);
                if (vars.dexData.configs.maxSupplyShares < vars.dexData.dexState.totalSupplyShares + vars.shares) {
                    console.log("Skipping smart coll vault due to supply limit reached");
                    continue;
                }
            }
            // Handle borrow setup.
            {
                vars.isNativeBorrow = constants.borrowToken.token0 == TokenUtils.ETH_ADDR;
                vars.borrowAmount = _config.borrowAmountInUSD != 0
                    ? amountInUSDPrice(
                        vars.isNativeBorrow ? TokenUtils.WETH_ADDR : constants.borrowToken.token0, _config.borrowAmountInUSD
                    )
                    : 0;    
            }
            // Encode call.
            {
                if (_config.shareType == FluidSupplyDexCommon.ShareType.VARIABLE) {
                    vars.shareVariableData = FluidSupplyDexCommon.SupplyVariableData({
                        collAmount0: _config.takeMaxUint256CollAmount0 ? type(uint256).max : vars.collAmount0,
                        collAmount1: _config.takeMaxUint256CollAmount1 ? type(uint256).max : vars.collAmount1,
                        minCollShares: vars.shares
                    });
                } else {
                    vars.shareExactData = FluidSupplyDexCommon.SupplyExactData({
                        perfectCollShares: vars.shares,
                        maxCollAmount0: _config.takeMaxUint256CollAmount0 ? type(uint256).max : vars.collAmount0,
                        maxCollAmount1: _config.takeMaxUint256CollAmount1 ? type(uint256).max : vars.collAmount1
                    });
                }

                vars.executeActionCallData = executeActionCalldata(
                    fluidVaultT2OpenEncode(
                        address(vaults[i]),
                        _config.shareType,
                        vars.shareVariableData,
                        vars.shareExactData,
                        vars.borrowAmount,
                        sender,
                        sender,
                        _config.wrapBorrowedEth
                    ),
                    _config.isDirect
                );
            }
            // Take snapshot before action execution.
            {
                vars.senderCollToken0BalanceBefore = balanceOf(constants.supplyToken.token0, sender);
                vars.senderCollToken1BalanceBefore = balanceOf(constants.supplyToken.token1, sender);
                vars.senderBorrowTokenBalanceBefore = vars.isNativeBorrow 
                    ? (
                        _config.wrapBorrowedEth ? balanceOf(TokenUtils.WETH_ADDR, sender) : address(sender).balance
                    )
                    : balanceOf(constants.borrowToken.token0, sender);    
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
                vars.senderCollToken0BalanceAfter = balanceOf(constants.supplyToken.token0, sender);
                vars.senderCollToken1BalanceAfter = balanceOf(constants.supplyToken.token1, sender);
                vars.senderBorrowTokenBalanceAfter = vars.isNativeBorrow 
                    ? (
                        _config.wrapBorrowedEth ? balanceOf(TokenUtils.WETH_ADDR, sender) : address(sender).balance 
                    ) 
                    : balanceOf(constants.borrowToken.token0, sender);    
            }
            // Assertions.
            {
                assertNotEq(vars.createdNft, 0);
                assertEq(vars.senderBorrowTokenBalanceAfter, vars.senderBorrowTokenBalanceBefore + vars.borrowAmount);

                if (_config.shareType == FluidSupplyDexCommon.ShareType.EXACT) {
                    assertGe(vars.senderCollToken0BalanceAfter, vars.senderCollToken0BalanceBefore - vars.collAmount0);
                    assertGe(vars.senderCollToken1BalanceAfter, vars.senderCollToken1BalanceBefore - vars.collAmount1);
                } else {
                    assertEq(vars.senderCollToken0BalanceAfter, vars.senderCollToken0BalanceBefore - vars.collAmount0);
                    assertEq(vars.senderCollToken1BalanceAfter, vars.senderCollToken1BalanceBefore - vars.collAmount1);    
                }
                
                (IFluidVaultResolver.UserPosition memory userPosition, ) = 
                    IFluidVaultResolver(FLUID_VAULT_RESOLVER).positionByNftId(vars.createdNft);

                assertEq(userPosition.owner, walletAddr);
                assertEq(userPosition.isLiquidated, false);
                assertEq(userPosition.isSupplyPosition, vars.borrowAmount == 0);    
            }
        }
    }
}