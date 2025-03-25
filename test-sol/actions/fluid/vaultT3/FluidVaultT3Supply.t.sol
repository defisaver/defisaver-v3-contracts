// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVault } from "../../../../contracts/interfaces/fluid/vaults/IFluidVault.sol";
import { IFluidVaultT3 } from "../../../../contracts/interfaces/fluid/vaults/IFluidVaultT3.sol";
import { IFluidVaultResolver } from "../../../../contracts/interfaces/fluid/resolvers/IFluidVaultResolver.sol";
import { FluidDexOpen } from "../../../../contracts/actions/fluid/dex/FluidDexOpen.sol";
import { FluidDexSupply } from "../../../../contracts/actions/fluid/dex/FluidDexSupply.sol";
import { FluidDexModel } from "../../../../contracts/actions/fluid/helpers/FluidDexModel.sol";
import { TokenUtils } from "../../../../contracts/utils/TokenUtils.sol";
import { SmartWallet } from "../../../utils/SmartWallet.sol";
import { FluidTestBase } from "../FluidTestBase.t.sol";

contract TestFluidVaultT3Supply is FluidTestBase {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    FluidDexSupply cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/

    SmartWallet wallet;
    address sender;
    address walletAddr;
    IFluidVaultT3[] vaults;

    FluidDexOpen openContract;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new FluidDexSupply();
        openContract = new FluidDexOpen();

        vaults = getT3Vaults();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_supply() public {
        bool isDirect = false;
        bool takeMaxUint256 = false;
        uint256 collateralAmountInUSD = 30000;
        _baseTest(isDirect, takeMaxUint256, collateralAmountInUSD);
    }

    function test_should_supply_direct_action() public {
        bool isDirect = true;
        bool takeMaxUint256 = false;
        uint256 collateralAmountInUSD = 30000;
        _baseTest(isDirect, takeMaxUint256, collateralAmountInUSD);
    }

    function test_should_supply_with_maxUint256() public {
        bool isDirect = false;
        bool takeMaxUint256 = true;
        uint256 collateralAmountInUSD = 30000;
        _baseTest(isDirect, takeMaxUint256, collateralAmountInUSD);
    }
    
    function _baseTest(
        bool _isDirect,
        bool _takeMaxUint256,
        uint256 _collateralAmountInUSD
    ) internal {
        uint256 initialSupplyOpenAmountUSD = 10000;

        for (uint256 i = 0; i < vaults.length; ++i) {

            uint256 nftId = executeFluidVaultT3Open(
                address(vaults[i]),
                initialSupplyOpenAmountUSD,
                0, /* _borrowAmount0InUSD */
                0, /* _borrowAmount1InUSD */
                wallet,
                address(openContract)
            );

            IFluidVault.ConstantViews memory constants = vaults[i].constantsView();
            if (constants.supplyToken.token0 == TokenUtils.ETH_ADDR) {
                constants.supplyToken.token0 = TokenUtils.WETH_ADDR;
            }

            uint256 supplyAmount = amountInUSDPrice(constants.supplyToken.token0, _collateralAmountInUSD);
            give(constants.supplyToken.token0, sender, supplyAmount);
            approveAsSender(sender, constants.supplyToken.token0, walletAddr, supplyAmount);

            bytes memory executeActionCallData = executeActionCalldata(
                fluidDexSupplyEncode(
                    address(vaults[i]),
                    sender,
                    nftId,
                    _takeMaxUint256 ? type(uint256).max : supplyAmount,
                    FluidDexModel.SupplyVariableData(0, 0, 0) /* only used for T2 and T4  vaults */
                ),
                _isDirect
            );

            IFluidVaultResolver.UserPosition memory userPositionBefore = fetchPositionByNftId(nftId);

            uint256 senderSupplyTokenBalanceBefore = balanceOf(constants.supplyToken.token0, sender);
            uint256 walletSupplyTokenBalanceBefore = balanceOf(constants.supplyToken.token0, walletAddr);
            wallet.execute(address(cut), executeActionCallData, 0);
            uint256 senderSupplyTokenBalanceAfter = balanceOf(constants.supplyToken.token0, sender);
            uint256 walletSupplyTokenBalanceAfter = balanceOf(constants.supplyToken.token0, walletAddr);

            assertEq(walletSupplyTokenBalanceAfter, walletSupplyTokenBalanceBefore);
            assertEq(senderSupplyTokenBalanceAfter, senderSupplyTokenBalanceBefore - supplyAmount);

            IFluidVaultResolver.UserPosition memory userPositionAfter = fetchPositionByNftId(nftId);

            emit log_named_uint("supplyAmount", supplyAmount);
            emit log_named_uint("diff1", userPositionAfter.supply - userPositionBefore.supply);
            emit log_named_uint("userPositionBefore.supply", userPositionBefore.supply);
            emit log_named_uint("userPositionAfter.supply", userPositionAfter.supply);
        }
    }
}