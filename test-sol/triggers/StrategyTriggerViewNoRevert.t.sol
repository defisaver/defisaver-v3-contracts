// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { BaseTest } from "../utils/BaseTest.sol";
import { Addresses } from "../utils/Addresses.sol";
import { SmartWallet } from "../utils/SmartWallet.sol";
import { StrategyTriggerViewNoRevert } from
    "../../contracts/views/strategy/StrategyTriggerViewNoRevert.sol";
import { AaveV3CollateralSwitch } from "../../contracts/actions/aaveV3/AaveV3CollateralSwitch.sol";
import { IPoolV3 } from "../../contracts/interfaces/protocols/aaveV3/IPoolV3.sol";
import { IPoolAddressesProvider } from
    "../../contracts/interfaces/protocols/aaveV3/IPoolAddressesProvider.sol";
import { IDSProxy } from "../../contracts/interfaces/DS/IDSProxy.sol";

contract TestStrategyTriggerViewNoRevert is BaseTest, StrategyTriggerViewNoRevert {
    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address sender;
    address walletAddr;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();
    }

    function test_verifyRequiredAmountAndAllowance() public {
        address token = Addresses.USDC_ADDR;
        uint256 amount = uint256(5000);

        bytes32[] memory _subData = new bytes32[](4);
        _subData[0] = bytes32(uint256(uint160(token)));
        _subData[2] = bytes32(amount);

        // No balance, no allowance, trigger should be false
        assertEq(
            uint256(_tryToVerifyRequiredAmountAndAllowance(walletAddr, _subData)),
            uint256(TriggerStatus.FALSE),
            "trigger status should be false"
        );

        // Give balance
        gibTokens(bob, token, amount);

        // Has balance, no allowance, trigger should be false
        assertEq(
            uint256(_tryToVerifyRequiredAmountAndAllowance(walletAddr, _subData)),
            uint256(TriggerStatus.FALSE),
            "trigger status should be false"
        );

        // Give allowance
        approveAsSender(sender, token, walletAddr, amount);

        // Has balance, has allowance, trigger should be true
        assertEq(
            uint256(_tryToVerifyRequiredAmountAndAllowance(walletAddr, _subData)),
            uint256(TriggerStatus.TRUE),
            "trigger status should be true"
        );
    }

    function test_verifyRequiredAmountAndAllowance_with_revert() public view {
        bytes32[] memory _subData = new bytes32[](0);

        // Empty subData should revert
        assertEq(
            uint256(_tryToVerifyRequiredAmountAndAllowance(walletAddr, _subData)),
            uint256(TriggerStatus.REVERT),
            "trigger status should be revert"
        );

        bytes32[] memory _subData2 = new bytes32[](1);
        _subData2[0] = bytes32(uint256(uint160(address(0))));

        // Invalid token address should revert
        assertEq(
            uint256(_tryToVerifyRequiredAmountAndAllowance(walletAddr, _subData2)),
            uint256(TriggerStatus.REVERT),
            "trigger status should be revert"
        );
    }

    function test_verifyAaveV3MinDebtCondition() public view {
        //vm.warp(1748518160);
        address walletWithEnoughDebt = 0xaB5a28B6Ca2D1E12FE5AcC7341352d5032b74438;
        assertEq(
            uint256(_verifyAaveV3MinDebtPosition(walletWithEnoughDebt)),
            uint256(TriggerStatus.TRUE),
            "trigger status should be true"
        );

        address walletWithNotEnoughDebt = 0x486c0bE444b63898Cca811654709f7D9e036Dc4E;
        assertEq(
            uint256(_verifyAaveV3MinDebtPosition(walletWithNotEnoughDebt)),
            uint256(TriggerStatus.FALSE),
            "trigger status should be false"
        );
    }

    function test_verifySparkLeverageManagementConditions() public view {
        address walletWithEnoughDebt = 0x3a0DC3fC4b84E2427ced214C9CE858eA218E97d9;
        assertEq(
            uint256(_verifySparkMinDebtPosition(walletWithEnoughDebt)),
            uint256(TriggerStatus.TRUE),
            "trigger status should be true"
        );

        address walletWithNotEnoughDebt = 0xe384F9cba7e27Df646C3E636136E5af57EC359FC;
        assertEq(
            uint256(_verifySparkMinDebtPosition(walletWithNotEnoughDebt)),
            uint256(TriggerStatus.FALSE),
            "trigger status should be false"
        );
    }

    function test_verifyAaveV3Ltv0() public view {
        address walletWithLTV0Asset = 0xeCA1395C29527b4CeA5AF5517138Ac01754bcfC8;
        assertEq(
            uint256(_verifyAaveV3Ltv0Position(walletWithLTV0Asset)),
            uint256(TriggerStatus.FALSE),
            "trigger status should be FALSE"
        );

        address walletWithLTV0Asset2 = 0x9495D189896FCb04e3d2E5bB102Ad76C6782c41A;
        assertEq(
            uint256(_verifyAaveV3Ltv0Position(walletWithLTV0Asset2)),
            uint256(TriggerStatus.FALSE),
            "trigger status should be FALSE"
        );

        address walletWithLinkInEmode = 0x3bb52B3101324197d765c7E27e79C6b0b5BE8BaB;
        assertEq(
            uint256(_verifyAaveV3Ltv0Position(walletWithLinkInEmode)),
            uint256(TriggerStatus.TRUE),
            "trigger status should be TRUE"
        );
    }

    function test_verifyAaveV3Ltv0_afterDisablingLinkCollateral() public {
        address walletWithLTV0Asset2 = 0x9495D189896FCb04e3d2E5bB102Ad76C6782c41A;
        address walletOwner = 0x3745AF941FbBF3336aB21bB3a9853e75320382ab;
        IPoolV3 lendingPool = IPoolV3(IPoolAddressesProvider(DEFAULT_AAVE_MARKET).getPool());
        uint16 linkAssetId = lendingPool.getReserveData(Addresses.LINK_ADDR).id;
        AaveV3CollateralSwitch collSwitch = new AaveV3CollateralSwitch();

        uint16[] memory assetIds = new uint16[](1);
        assetIds[0] = linkAssetId;
        bool[] memory useAsCollateral = new bool[](1);
        useAsCollateral[0] = false;

        AaveV3CollateralSwitch.Params memory params = AaveV3CollateralSwitch.Params({
            arrayLength: 1,
            useDefaultMarket: true,
            assetIds: assetIds,
            useAsCollateral: useAsCollateral,
            market: address(0)
        });

        vm.prank(walletOwner);
        IDSProxy(payable(walletWithLTV0Asset2)).execute(
            address(collSwitch),
            abi.encodeWithSelector(collSwitch.executeActionDirect.selector, abi.encode(params))
        );

        assertEq(
            uint256(_verifyAaveV3Ltv0Position(walletWithLTV0Asset2)),
            uint256(TriggerStatus.TRUE),
            "trigger status should be TRUE after using LINK as collateral is disabled"
        );
    }
}
