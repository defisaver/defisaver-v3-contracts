// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { BaseTest } from "../utils/BaseTest.sol";
import { Tokens } from "../utils/Tokens.sol";
import { Addresses } from "../utils/Addresses.sol";
import { SmartWallet } from "../utils/SmartWallet.sol";
import { StrategyTriggerViewNoRevert } from "../../contracts/views/strategy/StrategyTriggerViewNoRevert.sol";
import { IComet } from "../../contracts/interfaces/compoundV3/IComet.sol";
import { IERC20 } from "../../contracts/interfaces/IERC20.sol";

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
            uint256(TriggerStatus.FALSE), "trigger status should be false"
        );

        // Give balance
        gibTokens(bob, token, amount);

        // Has balance, no allowance, trigger should be false
        assertEq(
            uint256(_tryToVerifyRequiredAmountAndAllowance(walletAddr, _subData)),
            uint256(TriggerStatus.FALSE), "trigger status should be false"
        );

        // Give allowance
        approveAsSender(sender, token, walletAddr, amount);

        // Has balance, has allowance, trigger should be true
        assertEq(
            uint256(_tryToVerifyRequiredAmountAndAllowance(walletAddr, _subData)),
            uint256(TriggerStatus.TRUE), "trigger status should be true"
        );
    }

    function test_verifyRequiredAmountAndAllowance_with_revert() public view {
        bytes32[] memory _subData = new bytes32[](0);
        
        // Empty subData should revert
        assertEq(
            uint256(_tryToVerifyRequiredAmountAndAllowance(walletAddr, _subData)),
            uint256(TriggerStatus.REVERT), "trigger status should be revert"
        );

        bytes32[] memory _subData2 = new bytes32[](1);
        _subData2[0] = bytes32(uint256(uint160(address(0))));

        // Invalid token address should revert
        assertEq(
            uint256(_tryToVerifyRequiredAmountAndAllowance(walletAddr, _subData2)),
            uint256(TriggerStatus.REVERT), "trigger status should be revert"
        );
    }

    // Aave 
    function test_verifyAaveV3LeverageManagementConditions() public view {
        //vm.warp(1748518160);
        address walletWithEnoughDebt = 0xaB5a28B6Ca2D1E12FE5AcC7341352d5032b74438;
        assertEq(
            uint256(_verifyAaveV3MinDebtPosition(walletWithEnoughDebt)),
            uint256(TriggerStatus.TRUE), "trigger status should be true"
        );

        address walletWithNotEnoughDebt = 0x486c0bE444b63898Cca811654709f7D9e036Dc4E;
        assertEq(
            uint256(_verifyAaveV3MinDebtPosition(walletWithNotEnoughDebt)),
            uint256(TriggerStatus.FALSE), "trigger status should be false"
        );
    }

    // Spark
    function test_verifySparkLeverageManagementConditions() public view {
        address walletWithEnoughDebt = 0xc0c790F61a1721B70F0D4b1Aa1133687Fa3fd900;
        assertEq(
            uint256(_verifySparkMinDebtPosition(walletWithEnoughDebt)),
            uint256(TriggerStatus.TRUE), "trigger status should be true"
        );

        address walletWithNotEnoughDebt = 0xe384F9cba7e27Df646C3E636136E5af57EC359FC;
        assertEq(
            uint256(_verifySparkMinDebtPosition(walletWithNotEnoughDebt)),
            uint256(TriggerStatus.FALSE), "trigger status should be false"
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
        _baseTest(Addresses.COMET_USDC, Addresses.WETH_ADDR, 100e18, 5000e6);
    }

    function test_verifyCompV3MinDebtPosition_usdtMarket_mainnet() public {
        _baseTest(Addresses.COMET_USDT, Addresses.WETH_ADDR, 100e18, 5000e6);
    }


    function test_verifyCompV3MinDebtPosition_wethMarket_mainnet() public {
        // ETH price was 2616 at the moment, so we need to borrow value of ~ 2 ether to have more than 5k of debt
        _baseTest(Addresses.COMET_WETH, Addresses.WBTC_ADDR, 1e8, 2e18); 
    }

    function _baseTest(address _comet, address _depositToken, uint256 _amountToDeposit, uint256 _amountToBorrow)
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
