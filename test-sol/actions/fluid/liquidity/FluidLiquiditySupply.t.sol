// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    IFluidVaultResolver
} from "../../../../contracts/interfaces/protocols/fluid/resolvers/IFluidVaultResolver.sol";
import { FluidVaultT1Open } from "../../../../contracts/actions/fluid/vaultT1/FluidVaultT1Open.sol";
import { FluidDexOpen } from "../../../../contracts/actions/fluid/dex/FluidDexOpen.sol";
import { FluidVaultT1Supply } from "../../../../contracts/actions/fluid/vaultT1/FluidVaultT1Supply.sol";
import { FluidDexSupply } from "../../../../contracts/actions/fluid/dex/FluidDexSupply.sol";
import { FluidDexModel } from "../../../../contracts/actions/fluid/helpers/FluidDexModel.sol";
import { TokenUtils } from "../../../../contracts/utils/TokenUtils.sol";
import { SmartWallet } from "../../../utils/SmartWallet.sol";
import { FluidTestBase } from "../FluidTestBase.t.sol";

contract TestFluidLiquiditySupply is FluidTestBase {
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    FluidVaultT1Supply cut_FluidVaultT1Supply;
    FluidDexSupply cut_FluidDexSupply;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/

    SmartWallet wallet;
    address sender;
    address walletAddr;

    address[] t1Vaults;
    address[] t3Vaults;

    FluidVaultT1Open t1OpenContract;
    FluidDexOpen t3OpenContract;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("FluidLiquiditySupply");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut_FluidVaultT1Supply = new FluidVaultT1Supply();
        cut_FluidDexSupply = new FluidDexSupply();

        t1OpenContract = new FluidVaultT1Open();
        t3OpenContract = new FluidDexOpen();

        t1Vaults = getT1Vaults();
        t3Vaults = getT3Vaults();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_supply() public {
        bool isDirect = false;
        bool takeMaxUint256 = false;
        uint256 collateralAmountInUSD = 30_000;

        _baseTest(isDirect, takeMaxUint256, collateralAmountInUSD, true);
        _baseTest(isDirect, takeMaxUint256, collateralAmountInUSD, false);
    }

    function test_should_supply_direct_action() public {
        bool isDirect = true;
        bool takeMaxUint256 = false;
        uint256 collateralAmountInUSD = 30_000;

        _baseTest(isDirect, takeMaxUint256, collateralAmountInUSD, true);
        _baseTest(isDirect, takeMaxUint256, collateralAmountInUSD, false);
    }

    function test_should_supply_with_maxUint256() public {
        bool isDirect = false;
        bool takeMaxUint256 = true;
        uint256 collateralAmountInUSD = 30_000;

        _baseTest(isDirect, takeMaxUint256, collateralAmountInUSD, true);
        _baseTest(isDirect, takeMaxUint256, collateralAmountInUSD, false);
    }

    function _baseTest(bool _isDirect, bool _takeMaxUint256, uint256 _collateralAmountInUSD, bool _t1VaultsSelected)
        internal
    {
        uint256 initialSupplyOpenAmountUSD = 10_000;

        address[] memory vaults = _t1VaultsSelected ? t1Vaults : t3Vaults;

        for (uint256 i = 0; i < vaults.length; ++i) {
            uint256 nftId = _t1VaultsSelected
                ? executeFluidVaultT1Open(
                    address(vaults[i]), initialSupplyOpenAmountUSD, 0, wallet, address(t1OpenContract)
                )
                : executeFluidVaultT3Open(
                    address(vaults[i]),
                    initialSupplyOpenAmountUSD,
                    0, /* _borrowAmount0InUSD */
                    0, /* _borrowAmount1InUSD */
                    wallet,
                    address(t3OpenContract)
                );

            if (!_t1VaultsSelected && nftId == 0) {
                logSkipTestBecauseOfOpen(vaults[i]);
                continue;
            }

            FluidTestBase.TokensData memory tokens = getTokens(vaults[i], _t1VaultsSelected);

            if (tokens.supply0 == TokenUtils.ETH_ADDR) {
                tokens.supply0 = TokenUtils.WETH_ADDR;
            }

            uint256 supplyAmount = amountInUSDPrice(tokens.supply0, _collateralAmountInUSD);
            give(tokens.supply0, sender, supplyAmount);
            approveAsSender(sender, tokens.supply0, walletAddr, supplyAmount);

            bytes memory executeActionCallData = executeActionCalldata(
                _t1VaultsSelected
                    ? fluidVaultT1SupplyEncode(
                        address(vaults[i]), nftId, _takeMaxUint256 ? type(uint256).max : supplyAmount, sender
                    )
                    : fluidDexSupplyEncode(
                        address(vaults[i]),
                        sender,
                        nftId,
                        _takeMaxUint256 ? type(uint256).max : supplyAmount,
                        FluidDexModel.SupplyVariableData(0, 0, 0) /* only used for T2 and T4  vaults */
                    ),
                _isDirect
            );

            IFluidVaultResolver.UserPosition memory userPositionBefore = fetchPositionByNftId(nftId);

            uint256 senderSupplyTokenBalanceBefore = balanceOf(tokens.supply0, sender);
            uint256 walletSupplyTokenBalanceBefore = balanceOf(tokens.supply0, walletAddr);

            wallet.execute(
                _t1VaultsSelected ? address(cut_FluidVaultT1Supply) : address(cut_FluidDexSupply),
                executeActionCallData,
                0
            );

            uint256 senderSupplyTokenBalanceAfter = balanceOf(tokens.supply0, sender);
            uint256 walletSupplyTokenBalanceAfter = balanceOf(tokens.supply0, walletAddr);

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
