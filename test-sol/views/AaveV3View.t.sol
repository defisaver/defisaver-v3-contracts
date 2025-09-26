// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {IDebtToken} from "../../contracts/interfaces/aaveV3/IDebtToken.sol";
import {IPoolV3} from "../../contracts/interfaces/aaveV3/IPoolV3.sol";
import {IPoolAddressesProvider} from "../../contracts/interfaces/aaveV3/IPoolAddressesProvider.sol";
import {IAaveProtocolDataProvider} from "../../contracts/interfaces/aaveV3/IAaveProtocolDataProvider.sol";
import {DataTypes} from "../../contracts/interfaces/aaveV3/DataTypes.sol";

import {BaseTest} from "../utils/BaseTest.sol";
import {SmartWallet} from "../utils/SmartWallet.sol";
import {ActionsUtils} from "../utils/ActionsUtils.sol";
import {Addresses} from "../utils/Addresses.sol";

import {AaveV3View} from "../../contracts/views/AaveV3View.sol";
import {AaveV3Helper} from "../../contracts/actions/aaveV3/helpers/AaveV3Helper.sol";

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

    uint256 constant AMOUNT = 100e18;

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
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_Approvals_WithoutPosition() public {
        IPoolV3 lendingPool = getLendingPool(DEFAULT_AAVE_MARKET);
        IAaveProtocolDataProvider dataProvider = getDataProvider(DEFAULT_AAVE_MARKET);

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

    // TODO
    function test_Approvals_AfterOpeningPosition_Proxy() public {
        IPoolV3 lendingPool = getLendingPool(DEFAULT_AAVE_MARKET);
        IAaveProtocolDataProvider dataProvider = getDataProvider(DEFAULT_AAVE_MARKET);

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

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
        //////////////////////////////////////////////////////////////////////////*/
}
