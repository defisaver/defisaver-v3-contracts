// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVaultT2 } from "../../../../contracts/interfaces/fluid/IFluidVaultT2.sol";
import { IFluidVaultResolver } from "../../../../contracts/interfaces/fluid/IFluidVaultResolver.sol";
import { IFluidDexResolver } from "../../../../contracts/interfaces/fluid/IFluidDexResolver.sol";
import { IFluidVaultFactory } from "../../../../contracts/interfaces/fluid/IFluidVaultFactory.sol";
import { FluidVaultT2Open } from "../../../../contracts/actions/fluid/vaultT2/FluidVaultT2Open.sol";
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
        FluidVaultT2Open.ShareType shareType;
        // used for variable share type
        uint256 collAmount0InUSD;
        uint256 collAmount1InUSD;
        bool takeMaxUint256CollAmount0;
        bool takeMaxUint256CollAmount1;
        // used for exact share type
        uint256 perfectCollShares;
        uint256 maxCollAmount0InUSD;
        uint256 maxCollAmount1InUSD;
        // used for borrow
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
        FluidVaultT2Open.ShareExactData shareExactData;
        FluidVaultT2Open.ShareVariableData shareVariableData;
        IFluidDexResolver.DexEntireData dexData;
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
        TestConfig memory t;
        t.collAmount0InUSD = 30000;
        t.collAmount1InUSD = 0;
        t.takeMaxUint256CollAmount0 = false;
        t.takeMaxUint256CollAmount1 = false;
        t.borrowAmountInUSD = 10000;
        t.wrapBorrowedEth = false;
        t.isDirect = false;

        _baseTest(_variableConfigPlaceHolder(t));
    }
    function test_should_open_variable_position_with_coll_1() public {
        TestConfig memory t;
        t.collAmount0InUSD = 0;
        t.collAmount1InUSD = 30000;
        t.takeMaxUint256CollAmount0 = false;
        t.takeMaxUint256CollAmount1 = false;
        t.borrowAmountInUSD = 10000;
        t.wrapBorrowedEth = false;
        t.isDirect = false;

        _baseTest(_variableConfigPlaceHolder(t));
    }
    function test_should_open_variable_position_with_both_coll() public {
        TestConfig memory t;
        t.collAmount0InUSD = 30000;
        t.collAmount1InUSD = 20000;
        t.takeMaxUint256CollAmount0 = false;
        t.takeMaxUint256CollAmount1 = false;
        t.borrowAmountInUSD = 12000;
        t.wrapBorrowedEth = false;
        t.isDirect = false;

        _baseTest(_variableConfigPlaceHolder(t));
    }
    function test_should_open_variable_position_only_supply() public {
        TestConfig memory t;
        t.collAmount0InUSD = 11000;
        t.collAmount1InUSD = 5000;
        t.takeMaxUint256CollAmount0 = false;
        t.takeMaxUint256CollAmount1 = false;
        t.borrowAmountInUSD = 0;
        t.wrapBorrowedEth = false;
        t.isDirect = false;

        _baseTest(_variableConfigPlaceHolder(t));
    }
    function test_should_open_variable_position_action_direct() public {
        TestConfig memory t;
        t.collAmount0InUSD = 30000;
        t.collAmount1InUSD = 0;
        t.takeMaxUint256CollAmount0 = false;
        t.takeMaxUint256CollAmount1 = false;
        t.borrowAmountInUSD = 10000;
        t.wrapBorrowedEth = false;
        t.isDirect = true;

        _baseTest(_variableConfigPlaceHolder(t));
    }
    function test_should_open_variable_position_with_coll_0_maxUint256() public {
        TestConfig memory t;
        t.collAmount0InUSD = 30000;
        t.collAmount1InUSD = 0;
        t.takeMaxUint256CollAmount0 = true;
        t.takeMaxUint256CollAmount1 = false;
        t.borrowAmountInUSD = 10000;
        t.wrapBorrowedEth = false;
        t.isDirect = false;

        _baseTest(_variableConfigPlaceHolder(t));
    }
    function test_should_open_variable_position_with_coll_1_maxUint256() public {
        TestConfig memory t;
        t.collAmount0InUSD = 30000;
        t.collAmount1InUSD = 25000;
        t.takeMaxUint256CollAmount0 = false;
        t.takeMaxUint256CollAmount1 = true;
        t.borrowAmountInUSD = 10000;
        t.wrapBorrowedEth = false;
        t.isDirect = false;

        _baseTest(_variableConfigPlaceHolder(t));
    }
    function test_should_open_variable_position_with_borrow_eth_wrap() public {
        TestConfig memory t;
        t.collAmount0InUSD = 25000;
        t.collAmount1InUSD = 5000;
        t.takeMaxUint256CollAmount0 = false;
        t.takeMaxUint256CollAmount1 = false;
        t.borrowAmountInUSD = 10000;
        t.wrapBorrowedEth = true;
        t.isDirect = false;

        _baseTest(_variableConfigPlaceHolder(t));
    }

    function _variableConfigPlaceHolder(
        TestConfig memory _config
    ) internal pure returns (TestConfig memory) {
        _config.shareType = FluidVaultT2Open.ShareType.VARIABLE;
        _config.perfectCollShares = 0;
        _config.maxCollAmount0InUSD = 0;
        _config.maxCollAmount1InUSD = 0;
        return _config;
    }

    function _exactConfigPlaceHolder(
        TestConfig memory _config
    ) internal pure returns (TestConfig memory) {
        _config.shareType = FluidVaultT2Open.ShareType.EXACT;
        _config.collAmount0InUSD = 0;
        _config.collAmount1InUSD = 0;
        return _config;
    }

    function _baseTest(
        TestConfig memory _config        
    ) internal {
        for (uint256 i = 0; i < vaults.length; ++i) {
            IFluidVaultT2.ConstantViews memory constants = vaults[i].constantsView();
            LocalVars memory vars;

            vars.dexData = IFluidDexResolver(FLUID_DEX_RESOLVER).getDexEntireData(constants.supply);

            console.log(vars.dexData.configs.maxSupplyShares);
            console.log(vars.dexData.dexState.totalSupplyShares);

            // Handle collateral 0 setup.
            {
                bool isNativeColl0 = constants.supplyToken.token0 == TokenUtils.ETH_ADDR;
                constants.supplyToken.token0 = isNativeColl0 ? TokenUtils.WETH_ADDR : constants.supplyToken.token0;
                if (_config.shareType == FluidVaultT2Open.ShareType.VARIABLE && _config.collAmount0InUSD > 0) {
                    vars.collAmount0 = amountInUSDPrice(constants.supplyToken.token0, _config.collAmount0InUSD);
                    give(constants.supplyToken.token0, sender, vars.collAmount0);
                    approveAsSender(sender, constants.supplyToken.token0, walletAddr, vars.collAmount0);
                }
                if (_config.shareType == FluidVaultT2Open.ShareType.EXACT && _config.maxCollAmount0InUSD > 0) {
                    vars.collAmount0 = amountInUSDPrice(constants.supplyToken.token0, _config.maxCollAmount0InUSD);
                    give(constants.supplyToken.token0, sender, vars.collAmount0);
                    approveAsSender(sender, constants.supplyToken.token0, walletAddr, vars.collAmount0);
                }    
            }
            // Handle collateral 1 setup.
            {
                bool isNativeColl1 = constants.supplyToken.token1 == TokenUtils.ETH_ADDR;
                constants.supplyToken.token1 = isNativeColl1 ? TokenUtils.WETH_ADDR : constants.supplyToken.token1;
                if (_config.shareType == FluidVaultT2Open.ShareType.VARIABLE && _config.collAmount1InUSD > 0) {
                    vars.collAmount1 = amountInUSDPrice(constants.supplyToken.token1, _config.collAmount1InUSD);
                    give(constants.supplyToken.token1, sender, vars.collAmount1);
                    approveAsSender(sender, constants.supplyToken.token1, walletAddr, vars.collAmount1);
                }
                if (_config.shareType == FluidVaultT2Open.ShareType.EXACT && _config.maxCollAmount0InUSD > 0) {
                    vars.collAmount1 = amountInUSDPrice(constants.supplyToken.token1, _config.maxCollAmount0InUSD);
                    give(constants.supplyToken.token1, sender, vars.collAmount1);
                    approveAsSender(sender, constants.supplyToken.token1, walletAddr, vars.collAmount1);
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
                if (_config.shareType == FluidVaultT2Open.ShareType.VARIABLE) {
                    vars.shareVariableData = FluidVaultT2Open.ShareVariableData({
                        collAmount0: _config.takeMaxUint256CollAmount0 ? type(uint256).max : vars.collAmount0,
                        collAmount1: _config.takeMaxUint256CollAmount1 ? type(uint256).max : vars.collAmount1,
                        minCollShares: 1
                    });
                } else {
                    vars.shareExactData = FluidVaultT2Open.ShareExactData({
                        perfectCollShares: _config.perfectCollShares,
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

                if (_config.shareType == FluidVaultT2Open.ShareType.EXACT) {
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