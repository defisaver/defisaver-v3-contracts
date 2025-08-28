// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {IComet} from "../../contracts/interfaces/compoundV3/IComet.sol";
import {IERC20} from "../../contracts/interfaces/IERC20.sol";
import {BaseTest} from "../utils/BaseTest.sol";
import {Tokens} from "../utils/Tokens.sol";
import {Addresses} from "../utils/Addresses.sol";
import {SmartWallet} from "../utils/SmartWallet.sol";
import {StrategyTriggerViewNoRevert} from "../../contracts/views/strategy/StrategyTriggerViewNoRevert.sol";

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
        forkMainnet("StrategyTriggerViewNoRevert");

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

    // Aave
    function test_verifyAaveV3LeverageManagementConditions() public view {
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

    // AaveV3RepayOnPrice
    function test_verifyAaveV3RepayOnPriceConditions() public {
        //vm.warp(1748518160);
        address walletWithEnoughDebt = 0x60F5d62E26A52B034DE02182689CC6200de7fD29;

        bytes32[] memory subData = new bytes32[](7);
        subData[0] = bytes32(uint256(uint160(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2))); // WETH
        subData[1] = bytes32(0);
        subData[2] = bytes32(uint256(uint160(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48))); // USDC
        subData[3] = bytes32(uint256(3));
        subData[4] = bytes32(uint256(uint160(0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e))); // Aave V3 Pool Addresses Provider
        subData[5] = bytes32(uint256(0x056bc75e2d63100000)); // Target ratio (1e20)
        subData[6] = bytes32(0);

        // Initialize triggerData array properly
        bytes[] memory triggerData = new bytes[](1);
        triggerData[0] =
            hex"000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000073404c96000000000000000000000000000000000000000000000000000000000000000001";

        // Create StrategySub struct
        StrategySub memory sub =
            StrategySub({strategyOrBundleId: 37, isBundle: true, triggerData: triggerData, subData: subData});

        assertEq(
            uint256(this.checkTriggers(sub, triggerData, walletWithEnoughDebt)),
            uint256(TriggerStatus.TRUE),
            "trigger status should be true"
        );

        // Now set targetRatio very low so targetRatio <= startRatio and the trigger should be FALSE
        sub.subData[5] = bytes32(uint256(11e17)); // 110%

        assertEq(
            uint256(this.checkTriggers(sub, triggerData, walletWithEnoughDebt)),
            uint256(TriggerStatus.FALSE),
            "trigger status should be false"
        );
    }

    // Spark
    function test_verifySparkLeverageManagementConditions() public view {
        address walletWithEnoughDebt = 0xc0c790F61a1721B70F0D4b1Aa1133687Fa3fd900;
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

    // Compound V3
    function test_verifyCompV3MinDebtPosition_badMarket() public {
        address market = makeAddr("BAD MARKET");
        bytes32[] memory subData = new bytes32[](1);
        subData[0] = bytes32(uint256(uint160(market)));

        address walletWithEnoughDebt = 0xa85d0aAe0cE0091e3DD78e0F5d5C39777f717D43;
        assertEq(
            uint256(_tryToVerifyCompV3MinDebtPosition(walletWithEnoughDebt, subData)),
            uint256(TriggerStatus.REVERT),
            "trigger status should be revert"
        );

        address walletWithNotEnoughDebt = 0xe384F9cba7e27Df646C3E636136E5af57EC359FC;
        assertEq(
            uint256(_tryToVerifyCompV3MinDebtPosition(walletWithNotEnoughDebt, subData)),
            uint256(TriggerStatus.REVERT),
            "trigger status should be revert"
        );
    }

    function test_verifyCompV3MinDebtPosition_usdcMarket_mainnet() public {
        _compV3BaseTest(Addresses.COMET_USDC, Addresses.WETH_ADDR, 100e18, 5000e6);
    }

    function test_verifyCompV3MinDebtPosition_usdtMarket_mainnet() public {
        _compV3BaseTest(Addresses.COMET_USDT, Addresses.WETH_ADDR, 100e18, 5000e6);
    }

    function test_verifyCompV3MinDebtPosition_wethMarket_mainnet() public {
        // ETH price was 2616 at the moment, so we need to borrow value of ~ 2 ether to have more than 5k of debt
        _compV3BaseTest(Addresses.COMET_WETH, Addresses.WBTC_ADDR, 1e8, 2e18);
    }

    function _compV3BaseTest(address _comet, address _depositToken, uint256 _amountToDeposit, uint256 _amountToBorrow)
        internal
    {
        bytes32[] memory subData = new bytes32[](1);
        subData[0] = bytes32(uint256(uint160(_comet)));

        assertEq(
            uint256(_tryToVerifyCompV3MinDebtPosition(sender, subData)),
            uint256(TriggerStatus.FALSE),
            "trigger status should be false"
        );

        // deal to sender
        give(_depositToken, sender, _amountToDeposit);

        // deposit as sender
        vm.startPrank(sender);
        IERC20(_depositToken).approve(_comet, _amountToDeposit);
        IComet(_comet).supply(_depositToken, _amountToDeposit);

        // borrow as sender
        address borrowToken = IComet(_comet).baseToken();
        IComet(_comet).withdraw(borrowToken, _amountToBorrow);

        vm.stopPrank();

        assertEq(
            uint256(_tryToVerifyCompV3MinDebtPosition(sender, subData)),
            uint256(TriggerStatus.TRUE),
            "trigger status should be true"
        );
    }
}
