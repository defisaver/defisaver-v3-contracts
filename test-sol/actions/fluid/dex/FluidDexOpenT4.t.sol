// SPDX-License-Identifier: MIT

pragma solidity =0.8.27;

import { IFluidVaultT4 } from "../../../../contracts/interfaces/fluid/vaults/IFluidVaultT4.sol";
import { FluidView } from "../../../../contracts/views/FluidView.sol";
import { FluidDexOpen } from "../../../../contracts/actions/fluid/dex/FluidDexOpen.sol";
import { FluidDexModel } from "../../../../contracts/actions/fluid/helpers/FluidDexModel.sol";
import { SmartWallet } from "../../../utils/SmartWallet.sol";
import { TokenUtils } from "../../../../contracts/utils/TokenUtils.sol";
import { Vm } from "forge-std/Vm.sol";
import { FluidTestBase } from "../FluidTestBase.t.sol";

contract TestFluidDexOpenT4 is FluidTestBase {

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
    address[] vaults;
    FluidView fluidView;

    struct TestConfig {
        uint256 collAmount0InUSD;
        uint256 collAmount1InUSD;
        bool takeMaxUint256CollAmount0;
        bool takeMaxUint256CollAmount1;
        uint256 borrowAmount0InUSD;
        uint256 borrowAmount1InUSD;
        bool wrapBorrowedEth;
        bool isDirect;
    }

    struct LocalVars {
        uint256 collAmount0;
        uint256 collAmount1;
        uint256 borrowAmount0;
        uint256 borrowAmount1;
        bool isNativeSupply0;
        bool isNativeSupply1;
        bool isNativeBorrow0;
        bool isNativeBorrow1;
        bytes executeActionCallData;
        uint256 collShares;
        uint256 debtShares;

        uint256 senderCollToken0BalanceBefore;
        uint256 senderCollToken1BalanceBefore;
        uint256 senderBorrowToken0BalanceBefore;
        uint256 senderBorrowToken1BalanceBefore;
        uint256 senderCollToken0BalanceAfter;
        uint256 senderCollToken1BalanceAfter;
        uint256 senderBorrowToken0BalanceAfter;
        uint256 senderBorrowToken1BalanceAfter;

        uint256 walletCollToken0BalanceBefore;
        uint256 walletCollToken1BalanceBefore;
        uint256 walletBorrowToken0BalanceBefore;
        uint256 walletBorrowToken1BalanceBefore;
        uint256 walletEthBalanceBefore;
        uint256 walletCollToken0BalanceAfter;
        uint256 walletCollToken1BalanceAfter;
        uint256 walletBorrowToken0BalanceAfter;
        uint256 walletBorrowToken1BalanceAfter;
        uint256 walletEthBalanceAfter;

        FluidView.UserPosition userPositionAfter;

        uint256 createdNft;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("FluidDexOpen");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new FluidDexOpen();

        vaults = getT4Vaults();
        fluidView = new FluidView();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_open_variable_position_with_coll_only() public {
        _baseTest(
            TestConfig({
                collAmount0InUSD: 30000,
                collAmount1InUSD: 20000,
                takeMaxUint256CollAmount0: false,
                takeMaxUint256CollAmount1: false,
                borrowAmount0InUSD: 0,
                borrowAmount1InUSD: 0,
                wrapBorrowedEth: false,
                isDirect: false
            })
        );
    }

    function test_should_open_variable_position_with_coll_0_only() public {
        _baseTest(
            TestConfig({
                collAmount0InUSD: 30000,
                collAmount1InUSD: 0,
                takeMaxUint256CollAmount0: false,
                takeMaxUint256CollAmount1: false,
                borrowAmount0InUSD: 0,
                borrowAmount1InUSD: 0,
                wrapBorrowedEth: false,
                isDirect: false
            })
        );
    }

    function test_should_open_variable_position_with_coll_1_only() public {
        _baseTest(
            TestConfig({
                collAmount0InUSD: 0,
                collAmount1InUSD: 30000,
                takeMaxUint256CollAmount0: false,
                takeMaxUint256CollAmount1: false,
                borrowAmount0InUSD: 0,
                borrowAmount1InUSD: 0,
                wrapBorrowedEth: false,
                isDirect: false
            })
        );
    }

    function test_should_open_variable_position_with_coll_and_borrow0() public {
        _baseTest(
            TestConfig({
                collAmount0InUSD: 30000,
                collAmount1InUSD: 20000,
                takeMaxUint256CollAmount0: false,
                takeMaxUint256CollAmount1: false,
                borrowAmount0InUSD: 10000,
                borrowAmount1InUSD: 0,
                wrapBorrowedEth: false,
                isDirect: false
            })
        );
    }

    function test_should_open_variable_position_with_coll_and_borrow1() public {
        _baseTest(
            TestConfig({
                collAmount0InUSD: 30000,
                collAmount1InUSD: 20000,
                takeMaxUint256CollAmount0: false,
                takeMaxUint256CollAmount1: false,
                borrowAmount0InUSD: 0,
                borrowAmount1InUSD: 10000,
                wrapBorrowedEth: false,
                isDirect: false
            })
        );
    }

    function test_should_open_variable_position_with_coll_and_both_borrows() public {
        _baseTest(
            TestConfig({
                collAmount0InUSD: 40000,
                collAmount1InUSD: 20000,
                takeMaxUint256CollAmount0: false,
                takeMaxUint256CollAmount1: false,
                borrowAmount0InUSD: 10000,
                borrowAmount1InUSD: 10000,
                wrapBorrowedEth: false,
                isDirect: false
            })
        );
    }

    function test_should_open_variable_position_with_coll_0_maxUint256() public {
        _baseTest(
            TestConfig({
                collAmount0InUSD: 30000,
                collAmount1InUSD: 20000,
                takeMaxUint256CollAmount0: true,
                takeMaxUint256CollAmount1: false,
                borrowAmount0InUSD: 10000,
                borrowAmount1InUSD: 0,
                wrapBorrowedEth: false,
                isDirect: false
            })
        );
    }

    function test_should_open_variable_position_with_coll_1_maxUint256() public {
        _baseTest(
            TestConfig({
                collAmount0InUSD: 30000,
                collAmount1InUSD: 20000,
                takeMaxUint256CollAmount0: false,
                takeMaxUint256CollAmount1: true,
                borrowAmount0InUSD: 10000,
                borrowAmount1InUSD: 0,
                wrapBorrowedEth: false,
                isDirect: false
            })
        );
    }

    function test_should_open_variable_position_with_borrow_eth_wrap() public {
        _baseTest(
            TestConfig({
                collAmount0InUSD: 30000,
                collAmount1InUSD: 20000,
                takeMaxUint256CollAmount0: false,
                takeMaxUint256CollAmount1: false,
                borrowAmount0InUSD: 10000,
                borrowAmount1InUSD: 0,
                wrapBorrowedEth: true,
                isDirect: false
            })
        );
    }

    function test_should_open_variable_position_action_direct() public {
        _baseTest(
            TestConfig({
                collAmount0InUSD: 30000,
                collAmount1InUSD: 20000,
                takeMaxUint256CollAmount0: false,
                takeMaxUint256CollAmount1: false,
                borrowAmount0InUSD: 10000,
                borrowAmount1InUSD: 0,
                wrapBorrowedEth: false,
                isDirect: true
            })
        );
    }

    function _baseTest(
        TestConfig memory _config        
    ) internal {
        for (uint256 i = 0; i < vaults.length; ++i) {
            FluidView.VaultData memory vaultData = fluidView.getVaultData(vaults[i]);
            LocalVars memory vars;

            // ------------- HANDLE COLLATERAL SETUP -------------
            {
                // Handle collateral 0 setup for T4 open
                vars.isNativeSupply0 = vaultData.supplyToken0 == TokenUtils.ETH_ADDR;
                (vaultData.supplyToken0, vars.collAmount0) = giveAndApproveToken(
                    vaultData.supplyToken0, sender, walletAddr, _config.collAmount0InUSD
                );

                // Handle collateral 1 setup for T4 open
                vars.isNativeSupply1 = vaultData.supplyToken1 == TokenUtils.ETH_ADDR;
                (vaultData.supplyToken1, vars.collAmount1) = giveAndApproveToken(
                    vaultData.supplyToken1, sender, walletAddr, _config.collAmount1InUSD
                );

                // Estimate collateral shares
                vars.collShares = estimateDepositShares(
                    vaultData.dexSupplyData.dexPool, 
                    vars.collAmount0, 
                    vars.collAmount1
                );

                // Validate supply limit
                if (supplyLimitReached(vaultData.dexSupplyData, vars.collShares)) {
                    logSupplyLimitReached(vaults[i]);
                    continue;
                }
            }
            // ------------- HANDLE BORROW SETUP -------------
            {
                // Handle borrow token 0 setup
                vars.isNativeBorrow0 = vaultData.borrowToken0 == TokenUtils.ETH_ADDR;
                vars.borrowAmount0 = _config.borrowAmount0InUSD != 0
                    ? amountInUSDPrice(
                        vars.isNativeBorrow0 ? TokenUtils.WETH_ADDR : vaultData.borrowToken0, 
                        _config.borrowAmount0InUSD
                    )
                    : 0;

                // Handle borrow token 1 setup
                vars.isNativeBorrow1 = vaultData.borrowToken1 == TokenUtils.ETH_ADDR;
                vars.borrowAmount1 = _config.borrowAmount1InUSD != 0
                    ? amountInUSDPrice(
                        vars.isNativeBorrow1 ? TokenUtils.WETH_ADDR : vaultData.borrowToken1, 
                        _config.borrowAmount1InUSD
                    )
                    : 0;

                // Estimate debt shares
                vars.debtShares = estimateBorrowShares(
                    vaultData.dexBorrowData.dexPool, 
                    vars.borrowAmount0, 
                    vars.borrowAmount1
                );

                // Validate borrow limit
                if (borrowLimitReached(vaultData.dexBorrowData, vars.debtShares)) {
                    logBorrowLimitReached(vaults[i]);
                    continue;
                }
            }

            // ------------- ENCODE CALL DATA -------------
            vars.executeActionCallData = executeActionCalldata(
                fluidDexOpenEncode(
                    vaults[i],
                    sender, /* from */
                    sender, /* to */
                    0, /* supplyAmount - Only used for T3 vaults */
                    FluidDexModel.SupplyVariableData(
                        _config.takeMaxUint256CollAmount0 ? type(uint256).max : vars.collAmount0,
                        _config.takeMaxUint256CollAmount1 ? type(uint256).max : vars.collAmount1,
                        vars.collShares
                    ),
                    0, /* borrowAmount - Only used for T1 and T2 vaults */
                    FluidDexModel.BorrowVariableData(vars.borrowAmount0, vars.borrowAmount1, vars.debtShares),
                    _config.wrapBorrowedEth
                ),
                _config.isDirect
            );

            // ------------- TAKE SNAPSHOTS BEFORE -------------

            _takeTokenBalancesSnapshotBefore(_config, vars, vaultData);

            // ------------- EXECUTE ACTION -------------
            
            vm.recordLogs();
            wallet.execute(address(cut), vars.executeActionCallData, 0);
            Vm.Log[] memory logs = vm.getRecordedLogs();
            vars.createdNft = getNftIdFromLogs(logs);

            // ------------- TAKE SNAPSHOTS AFTER -------------
            
            _takeTokenBalancesSnapshotAfter(_config, vars, vaultData);
            (vars.userPositionAfter, ) = fluidView.getPositionByNftId(vars.createdNft);

            // ------------- ASSERTIONS -------------
            
            // verify no dust left on wallet
            _assertNoDustLeftOnWallet(vars);

            // verify nft was created   
            assertTrue(vars.createdNft != 0);
            
            // Check position data
            assertEq(vars.userPositionAfter.owner, walletAddr);
            assertEq(vars.userPositionAfter.isLiquidated, false);
            assertEq(vars.userPositionAfter.isSupplyPosition, vars.borrowAmount0 == 0 && vars.borrowAmount1 == 0);

            // verify tokens balance changes
            _assertCollToken0BalanceChange(vars, vaultData, _config.wrapBorrowedEth);
            _assertCollToken1BalanceChange(vars, vaultData, _config.wrapBorrowedEth);
            _assertBorrowToken0BalanceChange(vars, vaultData, _config.wrapBorrowedEth);
            _assertBorrowToken1BalanceChange(vars, vaultData, _config.wrapBorrowedEth);
        }
    }

    function _takeTokenBalancesSnapshotBefore(
        TestConfig memory _config,
        LocalVars memory _vars,
        FluidView.VaultData memory _vaultData
    ) internal view {
        _vars.senderCollToken0BalanceBefore = balanceOf(_vaultData.supplyToken0, sender);
        _vars.senderCollToken1BalanceBefore = balanceOf(_vaultData.supplyToken1, sender);
        _vars.senderBorrowToken0BalanceBefore = _vars.isNativeBorrow0 
            ? (_config.wrapBorrowedEth ? balanceOf(TokenUtils.WETH_ADDR, sender) : address(sender).balance)
            : balanceOf(_vaultData.borrowToken0, sender);
        _vars.senderBorrowToken1BalanceBefore = _vars.isNativeBorrow1 
            ? (_config.wrapBorrowedEth ? balanceOf(TokenUtils.WETH_ADDR, sender) : address(sender).balance)
            : balanceOf(_vaultData.borrowToken1, sender);

        _vars.walletCollToken0BalanceBefore = balanceOf(_vaultData.supplyToken0, walletAddr);
        _vars.walletCollToken1BalanceBefore = balanceOf(_vaultData.supplyToken1, walletAddr);
        _vars.walletBorrowToken0BalanceBefore = _vars.isNativeBorrow0
            ? balanceOf(TokenUtils.WETH_ADDR, walletAddr)
            : balanceOf(_vaultData.borrowToken0, walletAddr);
        _vars.walletBorrowToken1BalanceBefore = _vars.isNativeBorrow1
            ? balanceOf(TokenUtils.WETH_ADDR, walletAddr)
            : balanceOf(_vaultData.borrowToken1, walletAddr);
        _vars.walletEthBalanceBefore = address(walletAddr).balance;
    }

    function _takeTokenBalancesSnapshotAfter(
        TestConfig memory _config,
        LocalVars memory _vars,
        FluidView.VaultData memory _vaultData
    ) internal view {
        _vars.senderCollToken0BalanceAfter = balanceOf(_vaultData.supplyToken0, sender);
        _vars.senderCollToken1BalanceAfter = balanceOf(_vaultData.supplyToken1, sender);
        _vars.senderBorrowToken0BalanceAfter = _vars.isNativeBorrow0 
            ? (_config.wrapBorrowedEth ? balanceOf(TokenUtils.WETH_ADDR, sender) : address(sender).balance)
            : balanceOf(_vaultData.borrowToken0, sender);
        _vars.senderBorrowToken1BalanceAfter = _vars.isNativeBorrow1 
            ? (_config.wrapBorrowedEth ? balanceOf(TokenUtils.WETH_ADDR, sender) : address(sender).balance)
            : balanceOf(_vaultData.borrowToken1, sender);

        _vars.walletCollToken0BalanceAfter = balanceOf(_vaultData.supplyToken0, walletAddr);
        _vars.walletCollToken1BalanceAfter = balanceOf(_vaultData.supplyToken1, walletAddr);
        _vars.walletBorrowToken0BalanceAfter = _vars.isNativeBorrow0
            ? balanceOf(TokenUtils.WETH_ADDR, walletAddr)
            : balanceOf(_vaultData.borrowToken0, walletAddr);
        _vars.walletBorrowToken1BalanceAfter = _vars.isNativeBorrow1
            ? balanceOf(TokenUtils.WETH_ADDR, walletAddr)
            : balanceOf(_vaultData.borrowToken1, walletAddr);
        _vars.walletEthBalanceAfter = address(walletAddr).balance;
    }

    function _assertNoDustLeftOnWallet(
        LocalVars memory _vars
    ) internal {
        assertEq(_vars.walletCollToken0BalanceAfter, _vars.walletCollToken0BalanceBefore);
        assertEq(_vars.walletCollToken1BalanceAfter, _vars.walletCollToken1BalanceBefore);
        assertEq(_vars.walletBorrowToken0BalanceAfter, _vars.walletBorrowToken0BalanceBefore);
        assertEq(_vars.walletBorrowToken1BalanceAfter, _vars.walletBorrowToken1BalanceBefore);
        assertEq(_vars.walletEthBalanceAfter, _vars.walletEthBalanceBefore);
    }

    function _assertCollToken0BalanceChange(
        LocalVars memory _vars,
        FluidView.VaultData memory _vaultData,
        bool _wrapBorrowedEth
    ) internal {
        if (_vars.collAmount0 == 0) return;

        int256 tokenDelta = -int256(_vars.collAmount0);

        if (_vars.isNativeSupply0 && _vars.isNativeBorrow0 && _wrapBorrowedEth) {
            tokenDelta += int256(_vars.borrowAmount0);
        }

        if (_vars.isNativeSupply0 && _vars.isNativeBorrow1 && _wrapBorrowedEth) {
            tokenDelta += int256(_vars.borrowAmount1);
        }

        if (!_vars.isNativeSupply0 && _vaultData.supplyToken0 == _vaultData.borrowToken0) {
            tokenDelta += int256(_vars.borrowAmount0);
        }

        if (!_vars.isNativeSupply0 && _vaultData.supplyToken0 == _vaultData.borrowToken1) {
            tokenDelta += int256(_vars.borrowAmount1);
        }

        if (tokenDelta < 0) {
            assertEq(_vars.senderCollToken0BalanceAfter, _vars.senderCollToken0BalanceBefore - uint256(-tokenDelta));
        } else {
            assertEq(_vars.senderCollToken0BalanceAfter, _vars.senderCollToken0BalanceBefore + uint256(tokenDelta));
        }
    }

    function _assertCollToken1BalanceChange(
        LocalVars memory _vars,
        FluidView.VaultData memory _vaultData,
        bool _wrapBorrowedEth
    ) internal {
        if (_vars.collAmount1 == 0) return;
        
        int256 tokenDelta = -int256(_vars.collAmount1);

        if (_vars.isNativeSupply1 && _vars.isNativeBorrow0 && _wrapBorrowedEth) {
            tokenDelta += int256(_vars.borrowAmount0);
        }

        if (_vars.isNativeSupply1 && _vars.isNativeBorrow1 && _wrapBorrowedEth) {
            tokenDelta += int256(_vars.borrowAmount1);
        }

        if (!_vars.isNativeSupply1 && _vaultData.supplyToken1 == _vaultData.borrowToken0) {
            tokenDelta += int256(_vars.borrowAmount0);
        }

        if (!_vars.isNativeSupply1 && _vaultData.supplyToken1 == _vaultData.borrowToken1) {
            tokenDelta += int256(_vars.borrowAmount1);
        }

        if (tokenDelta < 0) {
            assertEq(_vars.senderCollToken1BalanceAfter, _vars.senderCollToken1BalanceBefore - uint256(-tokenDelta));
        } else {
            assertEq(_vars.senderCollToken1BalanceAfter, _vars.senderCollToken1BalanceBefore + uint256(tokenDelta));
        }
    }

    function _assertBorrowToken0BalanceChange(
        LocalVars memory _vars,
        FluidView.VaultData memory _vaultData,
        bool _wrapBorrowedEth
    ) internal {
        if (_vars.borrowAmount0 == 0) return;
        
        if (
            ((_vars.isNativeSupply0 || _vars.isNativeSupply1) && _vars.isNativeBorrow0 && !_wrapBorrowedEth) ||
            (!_vars.isNativeSupply0 && !_vars.isNativeSupply1 && _vaultData.supplyToken0 != _vaultData.borrowToken0) 
        ) {
            assertEq(_vars.senderBorrowToken0BalanceAfter, _vars.senderBorrowToken0BalanceBefore + _vars.borrowAmount0);
        }   
    }

    function _assertBorrowToken1BalanceChange(
        LocalVars memory _vars,
        FluidView.VaultData memory _vaultData,
        bool _wrapBorrowedEth
    ) internal {
        if (_vars.borrowAmount1 == 0) return;
        
        if (
            ((_vars.isNativeSupply1 || _vars.isNativeSupply0) && _vars.isNativeBorrow1 && !_wrapBorrowedEth) ||
            (!_vars.isNativeSupply1 && !_vars.isNativeSupply0 && _vaultData.supplyToken1 != _vaultData.borrowToken1)
        ) {
            assertEq(_vars.senderBorrowToken1BalanceAfter, _vars.senderBorrowToken1BalanceBefore + _vars.borrowAmount1);
        }
    }
} 