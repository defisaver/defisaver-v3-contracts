// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { BaseTest } from "../utils/BaseTest.sol";
import { Addresses } from "../utils/helpers/MainnetAddresses.sol";
import { SmartWallet } from "../utils/SmartWallet.sol";
import {
    StrategyTriggerViewNoRevert
} from "../../contracts/views/strategy/StrategyTriggerViewNoRevert.sol";

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
        if (block.chainid != 1) {
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
