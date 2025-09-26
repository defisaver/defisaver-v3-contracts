// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {IDebtToken} from "../../contracts/interfaces/aaveV3/IDebtToken.sol";
import {IPoolV3} from "../../contracts/interfaces/aaveV3/IPoolV3.sol";
import {IPoolAddressesProvider} from "../../contracts/interfaces/aaveV3/IPoolAddressesProvider.sol";
import {IAaveProtocolDataProvider} from "../../contracts/interfaces/aaveV3/IAaveProtocolDataProvider.sol";
import {IERC20} from "../../contracts/interfaces/IERC20.sol";
import {DataTypes} from "../../contracts/interfaces/aaveV3/DataTypes.sol";

import {BaseTest} from "../utils/BaseTest.sol";
import {SmartWallet} from "../utils/SmartWallet.sol";
import {ActionsUtils} from "../utils/ActionsUtils.sol";
import {Addresses} from "../utils/Addresses.sol";
import {AaveV3Supply} from "../../contracts/actions/aaveV3/AaveV3Supply.sol";
import {AaveV3Borrow} from "../../contracts/actions/aaveV3/AaveV3Borrow.sol";

import {AaveV3View} from "../../contracts/views/AaveV3View.sol";
import {AaveV3Helper} from "../../contracts/actions/aaveV3/helpers/AaveV3Helper.sol";
import "forge-std/console.sol";

contract TestAaveV3View is BaseTest, ActionsUtils, AaveV3Helper {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV3View cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;
    IPoolV3 lendingPool;

    AaveV3Supply supplyContract;
    AaveV3Borrow borrowContract;

    uint256 constant AMOUNT = 100e18; // 100 WETH
    uint256 constant SUPPLY_AMOUNT = 10e18; // 10 WETH
    uint256 constant BORROW_AMOUNT = 1_000e6; // 1_000 USDC

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new AaveV3View();
        give(Addresses.WETH_ADDR, sender, AMOUNT);

        lendingPool = getLendingPool(DEFAULT_AAVE_MARKET);

        supplyContract = new AaveV3Supply();
        borrowContract = new AaveV3Borrow();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_Approvals_WithoutPosition() public {
        DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(Addresses.WETH_ADDR);

        AaveV3View.EOAApprovalData memory approvals =
            cut.getEOAApprovalsAndBalances(Addresses.WETH_ADDR, sender, walletAddr, DEFAULT_AAVE_MARKET);

        assertEq(approvals.asset, Addresses.WETH_ADDR);
        assertEq(approvals.aToken, reserveData.aTokenAddress);
        assertEq(approvals.variableDebtToken, reserveData.variableDebtTokenAddress);
        assertEq(approvals.assetApproval, 0);
        assertEq(approvals.aTokenApproval, 0);
        assertEq(approvals.variableDebtDelegation, 0);
        assertEq(approvals.suppliedAmount, 0);
        assertEq(approvals.eoaBalance, AMOUNT);
        assertEq(approvals.borrowedVariableAmount, 0);
        assertEq(approvals.aTokenBalance, 0);
    }

    function test_Approvals_AfterOpeningPosition_Proxy() public {
        DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(Addresses.WETH_ADDR);

        _createAaveV3Position(false, Addresses.WETH_ADDR, Addresses.USDC_ADDR);

        uint256 ratio = cut.getRatio(DEFAULT_AAVE_MARKET, walletAddr);
        console.log(ratio);
        console.log(ratio);
        console.log(ratio);
        console.log(ratio);
        console.log(ratio);
        console.log(ratio);
        console.log(ratio);

        AaveV3View.EOAApprovalData memory approvals =
            cut.getEOAApprovalsAndBalances(Addresses.WETH_ADDR, sender, walletAddr, DEFAULT_AAVE_MARKET);

        assertEq(approvals.asset, Addresses.WETH_ADDR);
        assertEq(approvals.aToken, reserveData.aTokenAddress);
        assertEq(approvals.variableDebtToken, reserveData.variableDebtTokenAddress);
        assertEq(approvals.assetApproval, type(uint256).max);
        assertEq(approvals.aTokenApproval, 0);
        assertEq(approvals.variableDebtDelegation, 0);
        assertEq(approvals.suppliedAmount, 0);
        assertEq(approvals.eoaBalance, AMOUNT - SUPPLY_AMOUNT);
        assertEq(approvals.borrowedVariableAmount, 0);
        assertEq(approvals.aTokenBalance, 0);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/

    function _createAaveV3Position(bool _isEOA, address _asset, address _debtToken) internal {
        vm.prank(sender);
        IERC20(_asset).approve(walletAddr, type(uint256).max);

        DataTypes.ReserveData memory reserveDataColl = lendingPool.getReserveData(_asset);
        DataTypes.ReserveData memory reserveDataDebt = lendingPool.getReserveData(_debtToken);

        // Execute Supply
        bytes memory supplyParams = aaveV3SupplyEncode(
            SUPPLY_AMOUNT,
            sender,
            reserveDataColl.id,
            false, // useDefaultMarket
            true, // useOnBehalf
            DEFAULT_AAVE_MARKET, // market (will use default)
            _isEOA ? sender : walletAddr
        );

        bytes memory supplyCalldata =
            abi.encodeWithSelector(bytes4(keccak256("executeActionDirect(bytes)")), supplyParams);
        wallet.execute(address(supplyContract), supplyCalldata, 0);

        // Execute Borrow
        bytes memory borrowParams = aaveV3BorrowEncode(
            BORROW_AMOUNT,
            sender,
            2, // rateMode (variable)
            reserveDataDebt.id,
            false, // useDefaultMarket
            true, // useOnBehalf
            DEFAULT_AAVE_MARKET, // market (will use default)
            _isEOA ? sender : walletAddr
        );
        bytes memory borrowCalldata =
            abi.encodeWithSelector(bytes4(keccak256("executeActionDirect(bytes)")), borrowParams);
        wallet.execute(address(borrowContract), borrowCalldata, 0);
    }
}
