// SPDX-License-Identifier: MIT

pragma solidity =0.8.27;

import { IAddressesRegistry } from "../../../contracts/interfaces/liquityV2/IAddressesRegistry.sol";
import { IPriceFeed } from "../../../contracts/interfaces/liquityV2/IPriceFeed.sol";
import { ITroveManager } from "../../../contracts/interfaces/liquityV2/ITroveManager.sol";
import { LiquityV2Open } from "../../../contracts/actions/liquityV2/trove/LiquityV2Open.sol";
import { LiquityV2View } from "../../../contracts/views/LiquityV2View.sol";
import { LiquityV2Supply } from "../../../contracts/actions/liquityV2/trove/LiquityV2Supply.sol";

import { LiquityV2ExecuteActions } from "../../utils/executeActions/LiquityV2ExecuteActions.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";

contract TestLiquityV2Supply is LiquityV2ExecuteActions {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    LiquityV2Supply cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/

    SmartWallet wallet;
    address sender;
    address walletAddr;
    IAddressesRegistry[] markets;
    address BOLD;
    address WETH;

    LiquityV2View viewContract;
    LiquityV2Open openContract;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new LiquityV2Supply();
        viewContract = new LiquityV2View();
        openContract = new LiquityV2Open();

        markets = getMarkets();
        BOLD = markets[0].boldToken();
        WETH = markets[0].collToken();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_supply_to_regular_trove() public {
        bool isDirect = false;
        bool isMaxUint256Supply = false;
        address interestBatchManager = address(0);
        _baseTest(isDirect, isMaxUint256Supply, interestBatchManager);
    }

    function test_should_supply_to_trove_inside_batch() public {
        bool isDirect = false;
        bool isMaxUint256Supply = false;
        address interestBatchManager = address(0xdeadbeaf);
        _baseTest(isDirect, isMaxUint256Supply, interestBatchManager);
    }

    function test_should_supply_direct() public {
        bool isDirect = true;
        bool isMaxUint256Supply = false;
        address interestBatchManager = address(0);
        _baseTest(isDirect, isMaxUint256Supply, interestBatchManager);
    }

    function test_should_supply_maxUint256() public {
        bool isDirect = false;
        bool isMaxUint256Supply = true;
        address interestBatchManager = address(0);
        _baseTest(isDirect, isMaxUint256Supply, interestBatchManager);
    }

    function _baseTest(bool _isDirect, bool _isMaxUint256Supply, address _interestBatchManager) public {
        uint256 collAmountInUSD = 30000;
        uint256 borrowAmountInUSD = 10000;
        uint256 supplyAmountInUSD = 20000;

        for (uint256 i = 0; i < markets.length; i++) {

            if (_interestBatchManager != address(0)) {
                vm.startPrank(_interestBatchManager);
                registerBatchManager(markets[i]);
                vm.stopPrank();
            }
            
            uint256 troveId = executeLiquityOpenTrove(
                markets[i],
                _interestBatchManager,
                collAmountInUSD,
                i,
                borrowAmountInUSD,
                1e18 / 10,
                0,
                wallet,
                openContract,
                viewContract
            );

            _supply(
                markets[i],
                troveId,
                _isDirect,
                _isMaxUint256Supply,
                supplyAmountInUSD
            );
        }
    }

    function _supply(
        IAddressesRegistry _market,
        uint256 _troveId,
        bool _isDirect,
        bool _isMaxUint256Supply,
        uint256 supplyAmountInUSD
    ) internal {
        uint256 collPriceWAD = IPriceFeed(_market.priceFeed()).lastGoodPrice();
        address collToken = _market.collToken();
        uint256 supplyAmount = amountInUSDPriceMock(collToken, supplyAmountInUSD, collPriceWAD / 1e10);

        ITroveManager troveManager = ITroveManager(_market.troveManager());
        ITroveManager.LatestTroveData memory troveData = troveManager.getLatestTroveData(_troveId);
        uint256 entireColl = troveData.entireColl;

        give(collToken, sender, supplyAmount);
        approveAsSender(sender, collToken, walletAddr, supplyAmount);

        bytes memory executeActionCallData = executeActionCalldata(
            liquityV2SupplyEncode(
                address(_market),
                sender,
                _troveId,
                _isMaxUint256Supply ? type(uint256).max : supplyAmount
            ),
            _isDirect
        );

        uint256 senderCollBalanceBefore = balanceOf(collToken, sender);
        wallet.execute(address(cut), executeActionCallData, 0);
        uint256 senderCollBalanceAfter = balanceOf(collToken, sender);

        assertEq(senderCollBalanceAfter, senderCollBalanceBefore - supplyAmount);
        troveData = troveManager.getLatestTroveData(_troveId);
        assertEq(troveData.entireColl, entireColl + supplyAmount);
    }
}