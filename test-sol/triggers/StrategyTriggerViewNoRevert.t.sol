// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { BaseTest } from "../utils/BaseTest.sol";
import { Addresses } from "../utils/helpers/MainnetAddresses.sol";
import { SmartWallet } from "../utils/SmartWallet.sol";
import {
    StrategyTriggerViewNoRevert
} from "../../contracts/views/strategy/StrategyTriggerViewNoRevert.sol";
import { AaveV3CollateralSwitch } from "../../contracts/actions/aaveV3/AaveV3CollateralSwitch.sol";
import { IPoolV3 } from "../../contracts/interfaces/protocols/aaveV3/IPoolV3.sol";
import {
    IPoolAddressesProvider
} from "../../contracts/interfaces/protocols/aaveV3/IPoolAddressesProvider.sol";
import { IDSProxy } from "../../contracts/interfaces/DS/IDSProxy.sol";

import { AaveV3Supply } from "../../contracts/actions/aaveV3/AaveV3Supply.sol";
import { AaveV3Borrow } from "../../contracts/actions/aaveV3/AaveV3Borrow.sol";
import { SparkSupply } from "../../contracts/actions/spark/SparkSupply.sol";
import { SparkBorrow } from "../../contracts/actions/spark/SparkBorrow.sol";

import { IPoolV3 } from "../../contracts/interfaces/protocols/aaveV3/IPoolV3.sol";
import { ISparkPool } from "../../contracts/interfaces/protocols/spark/ISparkPool.sol";
import {
    IPoolAddressesProvider
} from "../../contracts/interfaces/protocols/aaveV3/IPoolAddressesProvider.sol";
import {
    ISparkPoolAddressesProvider
} from "../../contracts/interfaces/protocols/spark/ISparkPoolAddressesProvider.sol";

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
        forkFromEnv("StrategyTriggerViewNoRevert");

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

    function test_verifyAaveV3LeverageManagementConditions() public {
        SmartWallet walletWithEnoughDebt = new SmartWallet(jane);
        _createAaveV3Position(
            DEFAULT_AAVE_MARKET,
            Addresses.WETH_ADDR,
            10e18,
            Addresses.USDC_ADDR,
            6000e6,
            walletWithEnoughDebt
        );
        assertEq(
            uint256(_verifyAaveV3MinDebtPosition(walletWithEnoughDebt.walletAddr())),
            uint256(TriggerStatus.TRUE),
            "trigger status should be true"
        );

        SmartWallet walletWithNotEnoughDebt = new SmartWallet(alice);
        _createAaveV3Position(
            DEFAULT_AAVE_MARKET,
            Addresses.WETH_ADDR,
            10e18,
            Addresses.USDC_ADDR,
            10e6,
            walletWithNotEnoughDebt
        );
        assertEq(
            uint256(_verifyAaveV3MinDebtPosition(walletWithNotEnoughDebt.walletAddr())),
            uint256(TriggerStatus.FALSE),
            "trigger status should be false"
        );
    }

    function test_verifySparkLeverageManagementConditions() public {
        if (!isMainnetSelected()) {
            vm.skip(true, "Spark is only supported on Mainnet");
        }

        SmartWallet walletWithEnoughDebt = new SmartWallet(jane);
        _createSparkPosition(
            DEFAULT_SPARK_MARKET_MAINNET,
            Addresses.WETH_ADDR,
            10e18,
            Addresses.USDC_ADDR,
            6000e6,
            walletWithEnoughDebt
        );
        assertEq(
            uint256(_verifySparkMinDebtPosition(walletWithEnoughDebt.walletAddr())),
            uint256(TriggerStatus.TRUE),
            "trigger status should be true"
        );

        SmartWallet walletWithNotEnoughDebt = new SmartWallet(alice);
        _createSparkPosition(
            DEFAULT_SPARK_MARKET_MAINNET,
            Addresses.WETH_ADDR,
            10e18,
            Addresses.USDC_ADDR,
            100e6,
            walletWithNotEnoughDebt
        );
        assertEq(
            uint256(_verifySparkMinDebtPosition(walletWithNotEnoughDebt.walletAddr())),
            uint256(TriggerStatus.FALSE),
            "trigger status should be false"
        );
    }

    function test_verifyAaveV3Ltv0() public {
        if (!isMainnetSelected()) {
            vm.skip(true, "Test only supported on Mainnet");
        }

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
        if (!isMainnetSelected()) {
            vm.skip(true, "Test only supported on Mainnet");
        }

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
        IDSProxy(payable(walletWithLTV0Asset2))
            .execute(
                address(collSwitch),
                abi.encodeWithSelector(collSwitch.executeActionDirect.selector, abi.encode(params))
            );

        assertEq(
            uint256(_verifyAaveV3Ltv0Position(walletWithLTV0Asset2)),
            uint256(TriggerStatus.TRUE),
            "trigger status should be TRUE after using LINK as collateral is disabled"
        );
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/

    function _createAaveV3Position(
        address _market,
        address _supplyToken,
        uint256 _supplyAmount,
        address _borrowToken,
        uint256 _borrowAmount,
        SmartWallet _wallet
    ) internal {
        IPoolV3 pool = IPoolV3(IPoolAddressesProvider(_market).getPool());
        uint16 supplyAssetId = pool.getReserveData(_supplyToken).id;
        uint16 borrowAssetId = pool.getReserveData(_borrowToken).id;

        give(_supplyToken, _wallet.owner(), _supplyAmount);
        _wallet.ownerApprove(_supplyToken, _supplyAmount);

        bytes memory supplyCalldata = abi.encodeWithSelector(
            bytes4(keccak256("executeActionDirect(bytes)")),
            abi.encode(
                AaveV3Supply.Params({
                    amount: _supplyAmount,
                    from: _wallet.owner(),
                    assetId: supplyAssetId,
                    enableAsColl: true,
                    useDefaultMarket: false,
                    useOnBehalf: false,
                    market: _market,
                    onBehalf: address(0)
                })
            )
        );
        _wallet.execute(address(new AaveV3Supply()), supplyCalldata, 0);

        bytes memory borrowCalldata = abi.encodeWithSelector(
            bytes4(keccak256("executeActionDirect(bytes)")),
            abi.encode(
                AaveV3Borrow.Params({
                    amount: _borrowAmount,
                    to: _wallet.owner(),
                    rateMode: 2,
                    assetId: borrowAssetId,
                    useDefaultMarket: false,
                    useOnBehalf: false,
                    market: _market,
                    onBehalf: address(0)
                })
            )
        );
        _wallet.execute(address(new AaveV3Borrow()), borrowCalldata, 0);
    }

    function _createSparkPosition(
        address _market,
        address _supplyToken,
        uint256 _supplyAmount,
        address _borrowToken,
        uint256 _borrowAmount,
        SmartWallet _wallet
    ) internal {
        ISparkPool pool = ISparkPool(ISparkPoolAddressesProvider(_market).getPool());
        uint16 supplyAssetId = pool.getReserveData(_supplyToken).id;
        uint16 borrowAssetId = pool.getReserveData(_borrowToken).id;

        give(_supplyToken, _wallet.owner(), _supplyAmount);
        _wallet.ownerApprove(_supplyToken, _supplyAmount);

        bytes memory supplyCalldata = abi.encodeWithSelector(
            bytes4(keccak256("executeActionDirect(bytes)")),
            abi.encode(
                SparkSupply.Params({
                    amount: _supplyAmount,
                    from: _wallet.owner(),
                    assetId: supplyAssetId,
                    enableAsColl: true,
                    useDefaultMarket: false,
                    useOnBehalf: false,
                    market: _market,
                    onBehalf: address(0)
                })
            )
        );
        _wallet.execute(address(new SparkSupply()), supplyCalldata, 0);

        bytes memory borrowCalldata = abi.encodeWithSelector(
            bytes4(keccak256("executeActionDirect(bytes)")),
            abi.encode(
                SparkBorrow.Params({
                    amount: _borrowAmount,
                    to: _wallet.owner(),
                    rateMode: 2,
                    assetId: borrowAssetId,
                    useDefaultMarket: false,
                    useOnBehalf: false,
                    market: _market,
                    onBehalf: address(0)
                })
            )
        );
        _wallet.execute(address(new SparkBorrow()), borrowCalldata, 0);
    }
}
