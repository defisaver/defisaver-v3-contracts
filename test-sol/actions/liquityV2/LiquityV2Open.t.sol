// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    IAddressesRegistry
} from "../../../contracts/interfaces/protocols/liquityV2/IAddressesRegistry.sol";
import { ITroveManager } from "../../../contracts/interfaces/protocols/liquityV2/ITroveManager.sol";
import { IHintHelpers } from "../../../contracts/interfaces/protocols/liquityV2/IHintHelpers.sol";
import { IPriceFeed } from "../../../contracts/interfaces/protocols/liquityV2/IPriceFeed.sol";
import { ITroveNFT } from "../../../contracts/interfaces/protocols/liquityV2/ITroveNFT.sol";
import { LiquityV2Open } from "../../../contracts/actions/liquityV2/trove/LiquityV2Open.sol";
import { LiquityV2View } from "../../../contracts/views/LiquityV2View.sol";

import { LiquityV2TestHelper } from "./LiquityV2TestHelper.t.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { BaseTest } from "../../utils/BaseTest.sol";
import { ActionsUtils } from "../../utils/ActionsUtils.sol";

contract TestLiquityV2Open is BaseTest, LiquityV2TestHelper, ActionsUtils {
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    LiquityV2Open cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/

    SmartWallet wallet;
    address sender;
    address walletAddr;
    IAddressesRegistry[] markets;
    address BOLD;
    address WETH;

    LiquityV2View liquityV2View;

    struct TestConfig {
        bool isDirect;
        bool takeMaxUint256;
        address interestRateManager;
        uint256 annualInterestRate;
        uint256 collateralAmountInUSD;
        uint256 borrowAmountInUSD;
        bool senderHasEnoughForCollAndGas;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("LiquityV2Open");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new LiquityV2Open();
        liquityV2View = new LiquityV2View();
        markets = getMarkets();
        BOLD = markets[0].boldToken();
        WETH = markets[0].collToken();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_open_regular_trove() public {
        _baseTest(
            TestConfig({
                isDirect: false,
                takeMaxUint256: false,
                interestRateManager: address(0),
                annualInterestRate: 1e18 / 100, // 1%
                collateralAmountInUSD: 30_000,
                borrowAmountInUSD: 10_000,
                senderHasEnoughForCollAndGas: true
            })
        );
    }

    function test_should_open_trove_with_batch_manager() public {
        _baseTest(
            TestConfig({
                isDirect: false,
                takeMaxUint256: false,
                interestRateManager: address(0xdeadbeef),
                annualInterestRate: 0,
                collateralAmountInUSD: 30_000,
                borrowAmountInUSD: 10_000,
                senderHasEnoughForCollAndGas: true
            })
        );
    }

    function test_should_open_trove_with_action_direct() public {
        _baseTest(
            TestConfig({
                isDirect: true,
                takeMaxUint256: false,
                interestRateManager: address(0),
                annualInterestRate: 1e18 / 100, // 1%
                collateralAmountInUSD: 30_000,
                borrowAmountInUSD: 10_000,
                senderHasEnoughForCollAndGas: true
            })
        );
    }

    function test_should_open_trove_with_maxUint256_pull() public {
        _baseTest(
            TestConfig({
                isDirect: true,
                takeMaxUint256: true,
                interestRateManager: address(0),
                annualInterestRate: 1e18 / 100, // 1%
                collateralAmountInUSD: 30_000,
                borrowAmountInUSD: 10_000,
                senderHasEnoughForCollAndGas: true
            })
        );
    }

    function test_should_fail_to_open_trove_with_maxUint256_pull() public {
        _baseTest(
            TestConfig({
                isDirect: true,
                takeMaxUint256: true,
                interestRateManager: address(0),
                annualInterestRate: 1e18 / 100, // 1%
                collateralAmountInUSD: 30_000,
                borrowAmountInUSD: 10_000,
                senderHasEnoughForCollAndGas: false
            })
        );
    }

    function _baseTest(TestConfig memory _config) internal {
        for (uint256 i = 0; i < markets.length; i++) {
            if (_config.interestRateManager != address(0)) {
                vm.startPrank(_config.interestRateManager);
                registerBatchManager(markets[i]);
                vm.stopPrank();
            }

            IAddressesRegistry market = markets[i];
            address collToken = market.collToken();
            IHintHelpers hintHelpers = IHintHelpers(market.hintHelpers());

            uint256 interestRate = _config.interestRateManager != address(0)
                ? uint256(1e18 / 10)
                : _config.annualInterestRate;

            (uint256 upperHint, uint256 lowerHint) =
                getInsertPosition(liquityV2View, markets[i], i, interestRate);

            uint256 collPriceWAD = IPriceFeed(market.priceFeed()).lastGoodPrice();
            uint256 collAmount =
                amountInUSDPriceMock(collToken, _config.collateralAmountInUSD, collPriceWAD / 1e10);
            uint256 borrowAmount = amountInUSDPriceMock(BOLD, _config.borrowAmountInUSD, 1e8);

            uint256 predictMaxUpfrontFee = _config.interestRateManager != address(0)
                ? hintHelpers.predictOpenTroveAndJoinBatchUpfrontFee(
                    i, borrowAmount, _config.interestRateManager
                )
                : hintHelpers.predictOpenTroveUpfrontFee(i, borrowAmount, interestRate);

            LiquityV2Open.Params memory params = LiquityV2Open.Params({
                market: address(market),
                from: sender,
                to: sender,
                interestBatchManager: _config.interestRateManager,
                ownerIndex: 0,
                collAmount: collAmount,
                boldAmount: borrowAmount,
                upperHint: upperHint,
                lowerHint: lowerHint,
                annualInterestRate: interestRate,
                maxUpfrontFee: predictMaxUpfrontFee
            });

            _open(params, _config, collToken);
        }
    }

    function _open(
        LiquityV2Open.Params memory _params,
        TestConfig memory _config,
        address _collToken
    ) internal {
        if (_collToken == WETH) {
            if (_config.senderHasEnoughForCollAndGas) {
                give(WETH, sender, _params.collAmount + ETH_GAS_COMPENSATION);
                approveAsSender(sender, WETH, walletAddr, _params.collAmount + ETH_GAS_COMPENSATION);
            } else {
                // not enough WETH for gas compensation. This should revert
                give(WETH, sender, ETH_GAS_COMPENSATION - 1);
                approveAsSender(sender, WETH, walletAddr, ETH_GAS_COMPENSATION - 1);
            }
        } else {
            give(_collToken, sender, _params.collAmount);
            approveAsSender(sender, _collToken, walletAddr, _params.collAmount);

            give(WETH, sender, ETH_GAS_COMPENSATION);
            approveAsSender(sender, WETH, walletAddr, ETH_GAS_COMPENSATION);
        }

        bytes memory executeActionCallData = executeActionCalldata(
            liquityV2OpenEncode(
                _params.market,
                _params.from,
                _params.to,
                _params.interestBatchManager,
                _params.ownerIndex,
                _config.takeMaxUint256 ? type(uint256).max : _params.collAmount,
                _params.boldAmount,
                _params.upperHint,
                _params.lowerHint,
                _params.annualInterestRate,
                _params.maxUpfrontFee
            ),
            _config.isDirect
        );

        uint256 senderWethBalanceBefore = balanceOf(WETH, sender);
        uint256 senderCollBalanceBefore = balanceOf(_collToken, sender);

        if (!_config.senderHasEnoughForCollAndGas && _collToken == WETH) {
            vm.expectRevert();
            wallet.execute(address(cut), executeActionCallData, 0);
            return;
        } else {
            wallet.execute(address(cut), executeActionCallData, 0);
        }

        uint256 senderWethBalanceAfter = balanceOf(WETH, sender);
        uint256 senderCollBalanceAfter = balanceOf(_collToken, sender);

        if (_collToken == WETH) {
            assertEq(
                senderWethBalanceBefore - senderWethBalanceAfter,
                _params.collAmount + ETH_GAS_COMPENSATION
            );
        } else {
            assertEq(senderCollBalanceBefore - senderCollBalanceAfter, _params.collAmount);
            assertEq(senderWethBalanceBefore - senderWethBalanceAfter, ETH_GAS_COMPENSATION);
        }

        uint256 troveId = uint256(keccak256(abi.encode(walletAddr, walletAddr, 0)));

        LiquityV2View.TroveData memory troveData =
            liquityV2View.getTroveInfo(_params.market, troveId);

        assertEq(uint256(troveData.status), uint256(ITroveManager.Status.active));
        assertEq(troveData.collAmount, _params.collAmount);
        assertEq(troveData.annualInterestRate, _params.annualInterestRate);
        assertEq(troveData.interestBatchManager, _params.interestBatchManager);
        assertGe(troveData.debtAmount, _params.boldAmount);

        ITroveNFT troveNft = ITroveNFT(IAddressesRegistry(_params.market).troveNFT());
        assertEq(troveNft.ownerOf(troveId), walletAddr);
    }
}
