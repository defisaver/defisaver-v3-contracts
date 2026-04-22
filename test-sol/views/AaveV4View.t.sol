// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AaveV4View } from "../../contracts/views/AaveV4View.sol";
import { AaveV4TestBase } from "../actions/aaveV4/AaveV4TestBase.t.sol";
import {
    ITokenizationSpoke
} from "../../contracts/interfaces/protocols/aaveV4/ITokenizationSpoke.sol";
import { IERC20 } from "../../contracts/interfaces/token/IERC20.sol";
import { console2 } from "forge-std/console2.sol";

contract TestAaveV4View is AaveV4TestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV4View cut;
    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    address TEST_USER = 0xCB5A1E262867196fffE11F3dc226d76Bc753bF63;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        cut = new AaveV4View();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_get_reserve_data() public view {
        AaveV4View.ReserveData memory reserveData = cut.getReserveData(CORE_SPOKE, 0);
        _logReserveData(reserveData);
    }

    function test_get_reserves_data() public view {
        uint256[] memory reserveIds = new uint256[](2);
        reserveIds[0] = 0;
        reserveIds[1] = 1;
        AaveV4View.ReserveData[] memory reserveData = cut.getReservesData(CORE_SPOKE, reserveIds);
        console2.log("reserveData length:", reserveData.length);
        _logSeparator();
        for (uint256 i = 0; i < reserveData.length; i++) {
            _logReserveData(reserveData[i]);
            _logSeparator();
        }
    }

    function test_get_reserve_data_full() public view {
        AaveV4View.ReserveDataFull memory reserveData = cut.getReserveDataFull(CORE_SPOKE, 0);
        _logReserveDataFull(reserveData);
    }

    function test_get_reserves_data_full() public view {
        uint256[] memory reserveIds = new uint256[](2);
        reserveIds[0] = 0;
        reserveIds[1] = 1;
        AaveV4View.ReserveDataFull[] memory reserveData =
            cut.getReservesDataFull(CORE_SPOKE, reserveIds);
        console2.log("reserveDataFull length:", reserveData.length);
        _logSeparator();
        for (uint256 i = 0; i < reserveData.length; i++) {
            _logReserveDataFull(reserveData[i]);
            _logSeparator();
        }
    }

    function test_get_spoke_data() public view {
        (AaveV4View.SpokeData memory spokeData, AaveV4View.ReserveData[] memory reserves) =
            cut.getSpokeData(CORE_SPOKE);
        _logSpokeData(spokeData);
        console2.log("Reserves count:", reserves.length);
        _logSeparator();
        for (uint256 i = 0; i < reserves.length; i++) {
            _logReserveData(reserves[i]);
            _logSeparator();
        }
    }

    function test_get_spoke_data_full() public view {
        (AaveV4View.SpokeData memory spokeData, AaveV4View.ReserveDataFull[] memory reserves) =
            cut.getSpokeDataFull(CORE_SPOKE);
        _logSpokeData(spokeData);
        console2.log("Full Reserves count:", reserves.length);
        _logSeparator();
        for (uint256 i = 0; i < reserves.length; i++) {
            _logReserveDataFull(reserves[i]);
            _logSeparator();
        }
    }

    function test_get_loan_data() public view {
        AaveV4View.LoanData memory loanData = cut.getLoanData(CORE_SPOKE, TEST_USER);
        _logLoanData(loanData);
    }

    function test_get_loan_data_full() public view {
        AaveV4View.LoanDataWithFullReserves memory loanData =
            cut.getLoanDataFull(CORE_SPOKE, TEST_USER);
        console2.log("user:", loanData.user);
        console2.log("healthFactor:", loanData.healthFactor);
        console2.log("reserves:", loanData.reserves.length);
        if (loanData.reserves.length > 0) {
            console2.log("first reserve underlying:", loanData.reserves[0].underlying);
            console2.log("first reserve userSupplied:", loanData.reserves[0].userSupplied);
            console2.log("first reserve userTotalDebt:", loanData.reserves[0].userTotalDebt);
            console2.log("first reserve price:", loanData.reserves[0].price);
        }
    }

    function test_get_loan_data_for_multiple_spokes() public view {
        address[] memory spokes = new address[](1);
        spokes[0] = CORE_SPOKE;
        AaveV4View.LoanData[] memory loans = cut.getLoanDataForMultipleSpokes(TEST_USER, spokes);
        console2.log("Loans count:", loans.length);
        for (uint256 i = 0; i < loans.length; i++) {
            _logLoanData(loans[i]);
        }
    }

    function test_get_loan_data_for_multiple_users() public view {
        address[] memory users = new address[](1);
        users[0] = TEST_USER;
        AaveV4View.LoanData[] memory loans = cut.getLoanDataForMultipleUsers(CORE_SPOKE, users);
        console2.log("Loans count:", loans.length);
        for (uint256 i = 0; i < loans.length; i++) {
            _logLoanData(loans[i]);
        }
    }

    function test_get_reserve_price() public view {
        uint256 price = cut.getReservePrice(CORE_SPOKE, 0);
        console2.log("Reserve 0 Price:", price);
    }

    function test_get_reserve_prices() public view {
        uint256[] memory reserveIds = new uint256[](2);
        reserveIds[0] = 0;
        reserveIds[1] = 1;
        uint256[] memory prices = cut.getReservePrices(CORE_SPOKE, reserveIds);
        console2.log("Prices count:", prices.length);
        for (uint256 i = 0; i < prices.length; i++) {
            console2.log("Price", i, ":", prices[i]);
        }
    }

    function test_get_health_factor() public view {
        uint256 hf = cut.getHealthFactor(CORE_SPOKE, TEST_USER);
        console2.log("Health Factor:", hf);
    }

    function test_get_user_reserve_data() public view {
        uint256[] memory reserveIds = new uint256[](2);
        reserveIds[0] = 0;
        reserveIds[1] = 1;
        AaveV4View.UserReserveData[] memory userReserves =
            cut.getUserReserveData(CORE_SPOKE, TEST_USER, reserveIds);
        console2.log("User Reserves count:", userReserves.length);
        for (uint256 i = 0; i < userReserves.length; i++) {
            _logUserReserveData(userReserves[i]);
        }
    }

    function test_get_hub_asset_data() public view {
        AaveV4View.HubAssetData memory hubAssetData = cut.getHubAssetData(CORE_HUB, 1);
        _logHubAssetData(hubAssetData);
    }

    function test_get_hub_all_assets_data() public view {
        AaveV4View.HubAssetData[] memory hubAssetData = cut.getHubAllAssetsData(CORE_HUB);
        console2.log("Hub Assets count:", hubAssetData.length);
        _logSeparator();
        for (uint256 i = 0; i < hubAssetData.length; i++) {
            _logHubAssetData(hubAssetData[i]);
            _logSeparator();
        }
    }

    function test_get_spokes_for_asset() public view {
        address[] memory spokes = cut.getSpokesForAsset(CORE_HUB, 0);
        console2.log("Spokes for Asset 0:", spokes.length);
        _logSeparator();
        for (uint256 i = 0; i < spokes.length; i++) {
            console2.log("Spoke", i, ":", spokes[i]);
        }
    }

    function test_get_eoa_approvals_and_balances() public view {
        address proxy = address(0x1234);
        AaveV4View.EOAApprovalData memory data =
            cut.getEOAApprovalsAndBalances(TEST_USER, proxy, CORE_SPOKE);
        _logEOAApprovalData(data);
    }

    function test_get_tokenization_spokes_data() public {
        address USDC_PRIME = 0x486415fb1F8b062c89ED548f871cf64304AACb31;
        ITokenizationSpoke ts = ITokenizationSpoke(USDC_PRIME);
        address usdc = ts.asset();

        uint256 depositAmount = 1000 * (10 ** IERC20(usdc).decimals());
        give(usdc, bob, depositAmount);

        vm.startPrank(bob);
        IERC20(usdc).approve(USDC_PRIME, depositAmount);
        ts.deposit(depositAmount, bob);
        vm.stopPrank();

        address[] memory spokes = new address[](1);
        spokes[0] = USDC_PRIME;

        AaveV4View.TokenizationSpokeData[] memory data = cut.getTokenizationSpokesData(spokes, bob);
        for (uint256 i = 0; i < data.length; i++) {
            _logTokenizationSpokeData(data[i]);
            _logSeparator();
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _logSeparator() internal pure {
        console2.log("--------------------------------");
    }

    function _logReserveData(AaveV4View.ReserveData memory reserveData) internal pure {
        console2.log("underlying:", reserveData.underlying);
        console2.log("collateralFactor:", reserveData.collateralFactor);
        console2.log("price:", reserveData.price);
    }

    function _logLoanData(AaveV4View.LoanData memory loanData) internal pure {
        console2.log("user:", loanData.user);
        console2.log("riskPremium:", loanData.riskPremium);
        console2.log("avgCollateralFactor:", loanData.avgCollateralFactor);
        console2.log("healthFactor:", loanData.healthFactor);
        console2.log("totalCollateralInUsd:", loanData.totalCollateralInUsd);
        console2.log("totalDebtInUsdRay:", loanData.totalDebtInUsdRay);
        console2.log("activeCollateralCount:", loanData.activeCollateralCount);
        console2.log("borrowCount:", loanData.borrowCount);
        console2.log("reserves:", loanData.reserves.length);
        _logSeparator();
        for (uint256 i = 0; i < loanData.reserves.length; i++) {
            _logSeparator();
            console2.log("RESERVE DATA:", i);
            _logSeparator();
            _logUserReserveData(loanData.reserves[i]);
        }
    }

    function _logReserveDataFull(AaveV4View.ReserveDataFull memory reserveData) internal pure {
        console2.log("underlying:", reserveData.underlying);
        console2.log("hub:", reserveData.hub);
        console2.log("assetId:", reserveData.assetId);
        console2.log("decimals:", reserveData.decimals);
        console2.log("paused:", reserveData.paused);
        console2.log("frozen:", reserveData.frozen);
        console2.log("borrowable:", reserveData.borrowable);
        console2.log("collateralRisk:", reserveData.collateralRisk);
        console2.log("collateralFactor:", reserveData.collateralFactor);
        console2.log("maxLiquidationBonus:", reserveData.maxLiquidationBonus);
        console2.log("liquidationFee:", reserveData.liquidationFee);
        console2.log("price:", reserveData.price);
        console2.log("totalSupplied:", reserveData.totalSupplied);
        console2.log("totalDrawn:", reserveData.totalDrawn);
        console2.log("totalPremium:", reserveData.totalPremium);
        console2.log("totalDebt:", reserveData.totalDebt);
        console2.log("supplyCap:", reserveData.supplyCap);
        console2.log("borrowCap:", reserveData.borrowCap);
        console2.log("deficitRay:", reserveData.deficitRay);
        console2.log("spokeActive:", reserveData.spokeActive);
        console2.log("spokeHalted:", reserveData.spokeHalted);
    }

    function _logSpokeData(AaveV4View.SpokeData memory spokeData) internal pure {
        console2.log("targetHealthFactor:", spokeData.targetHealthFactor);
        console2.log("healthFactorForMaxBonus:", spokeData.healthFactorForMaxBonus);
        console2.log("liquidationBonusFactor:", spokeData.liquidationBonusFactor);
        console2.log("oracle:", spokeData.oracle);
        console2.log("oracleDecimals:", spokeData.oracleDecimals);
        console2.log("reserveCount:", spokeData.reserveCount);
    }

    function _logUserReserveData(AaveV4View.UserReserveData memory data) internal pure {
        console2.log("reserveId:", data.reserveId);
        console2.log("underlying:", data.underlying);
        console2.log("supplied:", data.supplied);
        console2.log("drawn:", data.drawn);
        console2.log("premium:", data.premium);
        console2.log("totalDebt:", data.totalDebt);
        console2.log("collateralFactor:", data.collateralFactor);
        console2.log("maxLiquidationBonus:", data.maxLiquidationBonus);
        console2.log("liquidationFee:", data.liquidationFee);
        console2.log("isUsingAsCollateral:", data.isUsingAsCollateral);
        console2.log("isBorrowing:", data.isBorrowing);
    }

    function _logHubAssetData(AaveV4View.HubAssetData memory data) internal pure {
        console2.log("assetId:", data.assetId);
        console2.log("decimals:", data.decimals);
        console2.log("underlying:", data.underlying);
        console2.log("liquidity:", data.liquidity);
        console2.log("totalSupplied:", data.totalSupplied);
        console2.log("totalDrawn:", data.totalDrawn);
        console2.log("totalPremium:", data.totalPremium);
        console2.log("totalDebt:", data.totalDebt);
        console2.log("totalDrawnShares:", data.totalDrawnShares);
        console2.log("totalPremiumShares:", data.totalPremiumShares);
        console2.log("swept:", data.swept);
        console2.log("liquidityFee:", data.liquidityFee);
        console2.log("drawnIndex:", data.drawnIndex);
        console2.log("drawnRate:", data.drawnRate);
        console2.log("lastUpdateTimestamp:", data.lastUpdateTimestamp);
        console2.log("irStrategy:", data.irStrategy);
        console2.log("reinvestmentController:", data.reinvestmentController);
        console2.log("feeReceiver:", data.feeReceiver);
        console2.log("deficitRay:", data.deficitRay);
    }

    function _logTokenizationSpokeData(AaveV4View.TokenizationSpokeData memory data) internal pure {
        console2.log("--- Asset ---");
        console2.log("underlyingAsset:", data.underlyingAsset);
        console2.log("assetId:", data.assetId);
        console2.log("decimals:", data.decimals);
        console2.log("--- Spoke ---");
        console2.log("spoke:", data.spoke);
        console2.log("spokeActive:", data.spokeActive);
        console2.log("spokeHalted:", data.spokeHalted);
        console2.log("spokeDepositCap:", data.spokeDepositCap);
        console2.log("spokeTotalAssets:", data.spokeTotalAssets);
        console2.log("spokeTotalShares:", data.spokeTotalShares);
        console2.log("--- Hub ---");
        console2.log("hub:", data.hub);
        console2.log("hubLiquidity:", data.hubLiquidity);
        console2.log("hubDrawnRate:", data.hubDrawnRate);
        console2.log("convertToShares:", data.convertToShares);
        console2.log("convertToAssets:", data.convertToAssets);
        console2.log("--- User ---");
        console2.log("user:", data.user);
        console2.log("userSuppliedAssets:", data.userSuppliedAssets);
        console2.log("userSuppliedShares:", data.userSuppliedShares);
    }

    function _logEOAApprovalData(AaveV4View.EOAApprovalData memory data) internal pure {
        console2.log("eoa:", data.eoa);
        console2.log("proxy:", data.proxy);
        console2.log("spoke:", data.spoke);
        console2.log("giverPositionManagerEnabled:", data.giverPositionManagerEnabled);
        console2.log("takerPositionManagerEnabled:", data.takerPositionManagerEnabled);
        console2.log("configPositionManagerEnabled:", data.configPositionManagerEnabled);
        console2.log("canSetUsingAsCollateral:", data.canSetUsingAsCollateral);
        console2.log("canUpdateUserRiskPremium:", data.canUpdateUserRiskPremium);
        console2.log("canUpdateUserDynamicConfig:", data.canUpdateUserDynamicConfig);
        _logSeparator();
        for (uint256 i = 0; i < data.reserveApprovals.length; i++) {
            AaveV4View.EOAReserveApprovalData memory r = data.reserveApprovals[i];
            console2.log("reserveId:", r.reserveId);
            console2.log("underlying:", r.underlying);
            console2.log("delegateeBorrowApproval:", r.delegateeBorrowApproval);
            console2.log("delegateeWithdrawApproval:", r.delegateeWithdrawApproval);
            console2.log("eoaReserveBalance:", r.eoaReserveBalance);
            _logSeparator();
        }
    }
}
