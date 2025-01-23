
import { IFluidVaultT1 } from "../../../../contracts/interfaces/fluid/IFluidVaultT1.sol";
import { IFluidVaultResolver } from "../../../../contracts/interfaces/fluid/IFluidVaultResolver.sol";
import { IFluidVaultFactory } from "../../../../contracts/interfaces/fluid/IFluidVaultFactory.sol";
import { FluidVaultT1Open } from "../../../../contracts/actions/fluid/vaultT1/FluidVaultT1Open.sol";
import { FluidTestHelper } from "../FluidTestHelper.t.sol";

import { SmartWallet } from "../../../utils/SmartWallet.sol";
import { BaseTest } from "../../../utils/BaseTest.sol";
import { ActionsUtils } from "../../../utils/ActionsUtils.sol";
import { Vm } from "forge-std/Vm.sol";
import { console } from "forge-std/console.sol";

contract TestFluidVaultT1Open is BaseTest, FluidTestHelper, ActionsUtils {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    FluidVaultT1Open cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/

    SmartWallet wallet;
    address sender;
    address walletAddr;
    IFluidVaultT1[] vaults;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new FluidVaultT1Open();

        vaults = getT1Vaults();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_open_position() public {
        bool isDirect = false;
        bool takeMaxUint256 = false;
        uint256 collateralAmountInUSD = 30000;
        uint256 borrowAmountInUSD = 10000;
        _baseTest(isDirect, takeMaxUint256, collateralAmountInUSD, borrowAmountInUSD);
    }
    function test_should_open_position_direct_action() public {
        bool isDirect = true;
        bool takeMaxUint256 = false;
        uint256 collateralAmountInUSD = 30000;
        uint256 borrowAmountInUSD = 10000;
        _baseTest(isDirect, takeMaxUint256, collateralAmountInUSD, borrowAmountInUSD);
    }
    function test_should_open_position_with_maxUint256() public {
        bool isDirect = false;
        bool takeMaxUint256 = true;
        uint256 collateralAmountInUSD = 30000;
        uint256 borrowAmountInUSD = 10000;
        _baseTest(isDirect, takeMaxUint256, collateralAmountInUSD, borrowAmountInUSD);
    }
    function test_should_open_only_supply_position() public {
        bool isDirect = false;
        bool takeMaxUint256 = false;
        uint256 collateralAmountInUSD = 30000;
        uint256 borrowAmountInUSD = 0;
        _baseTest(isDirect, takeMaxUint256, collateralAmountInUSD, borrowAmountInUSD);
    }
    function _baseTest(
        bool isDirect,
        bool takeMaxUint256,
        uint256 collateralAmountInUSD,
        uint256 borrowAmountInUSD
    ) internal {
        for (uint256 i = 0; i < vaults.length; ++i) {
            IFluidVaultT1.ConstantViews memory constants = vaults[i].constantsView();
            uint256 supplyAmount = amountInUSDPrice(constants.supplyToken, collateralAmountInUSD);
            give(constants.supplyToken, sender, supplyAmount);
            approveAsSender(sender, constants.supplyToken, walletAddr, supplyAmount);

            uint256 borrowAmount = borrowAmountInUSD != 0
                ? amountInUSDPrice(constants.borrowToken, borrowAmountInUSD)
                : 0;

            bytes memory executeActionCallData = executeActionCalldata(
                fluidVaultT1OpenEncode(
                    address(vaults[i]),
                    takeMaxUint256 ? type(uint256).max : supplyAmount,
                    borrowAmount,
                    sender,
                    sender
                ),
                isDirect
            );

            uint256[] memory nftIdsBefore = IFluidVaultResolver(FLUID_VAULT_RESOLVER).positionsNftIdOfUser(walletAddr);
            assertEq(nftIdsBefore.length, 0);

            uint256 senderSupplyTokenBalanceBefore = balanceOf(constants.supplyToken, sender);
            uint256 senderBorrowTokenBalanceBefore = balanceOf(constants.borrowToken, sender);

            vm.recordLogs();

            wallet.execute(address(cut), executeActionCallData, 0);

            Vm.Log[] memory logs = vm.getRecordedLogs();

            uint256[] memory nftIdsAfter = IFluidVaultResolver(FLUID_VAULT_RESOLVER).positionsNftIdOfUser(walletAddr);
            assertEq(nftIdsAfter.length, 1);

            uint256 createdNft = nftIdsAfter[0];
            for (uint256 i = 0; i < logs.length; ++i) {
                if (logs[i].topics[0] == IFluidVaultFactory.NewPositionMinted.selector) {
                    uint256 nftFromEvent = uint256(logs[i].topics[3]);
                    assertEq(createdNft, nftFromEvent);
                    break;
                }
            }

            uint256 senderSupplyTokenBalanceAfter = balanceOf(constants.supplyToken, sender);
            uint256 senderBorrowTokenBalanceAfter = balanceOf(constants.borrowToken, sender);

            assertEq(senderSupplyTokenBalanceAfter, senderSupplyTokenBalanceBefore - supplyAmount);
            assertEq(senderBorrowTokenBalanceAfter, senderBorrowTokenBalanceBefore + borrowAmount);

            (IFluidVaultResolver.UserPosition memory userPosition, ) = 
                IFluidVaultResolver(FLUID_VAULT_RESOLVER).positionByNftId(createdNft);

            assertEq(userPosition.owner, walletAddr);
            assertEq(userPosition.isLiquidated, false);
            assertEq(userPosition.isSupplyPosition, borrowAmount == 0);

            // _logData(supplyAmount, borrowAmount, userPosition);
        }
    }

    function _logData(
        uint256 supplyAmount,
        uint256 borrowAmount,
        IFluidVaultResolver.UserPosition memory userPosition
    ) internal {
        console.log("supplyAmount", supplyAmount);
        console.log("borrowAmount", borrowAmount);
        console.log("owner", userPosition.owner);
        console.log("isLiquidated", userPosition.isLiquidated);
        console.log("isSupplyPosition", userPosition.isSupplyPosition);
        console.log("tick", uint256(userPosition.tick));
        console.log("tickId", userPosition.tickId);
        console.log("beforeSupply", userPosition.beforeSupply);
        console.log("beforeBorrow", userPosition.beforeBorrow);
        console.log("beforeDustBorrow", userPosition.beforeDustBorrow);
        // TODO: check why supply amount mismatch stored user supply (ex. prices ?)
        console.log("supply", userPosition.supply);
        console.log("borrow", userPosition.borrow);
        console.log("dustBorrow", userPosition.dustBorrow);
    }
}