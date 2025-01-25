
import { IFluidVaultT1 } from "../../../../contracts/interfaces/fluid/IFluidVaultT1.sol";
import { IFluidVaultResolver } from "../../../../contracts/interfaces/fluid/IFluidVaultResolver.sol";
import { IFluidVaultFactory } from "../../../../contracts/interfaces/fluid/IFluidVaultFactory.sol";
import { FluidVaultT1Open } from "../../../../contracts/actions/fluid/vaultT1/FluidVaultT1Open.sol";
import { FluidVaultT1Withdraw } from "../../../../contracts/actions/fluid/vaultT1/FluidVaultT1Withdraw.sol";
import { TokenUtils } from "../../../../contracts/utils/TokenUtils.sol";
import { FluidExecuteActions } from "../../../utils/executeActions/FluidExecuteActions.sol";
import { SmartWallet } from "../../../utils/SmartWallet.sol";
import { console } from "forge-std/console.sol";

contract TestFluidVaultT1Withdraw is FluidExecuteActions {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    FluidVaultT1Withdraw cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/

    SmartWallet wallet;
    address sender;
    address walletAddr;
    IFluidVaultT1[] vaults;

    FluidVaultT1Open openContract;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new FluidVaultT1Withdraw();
        openContract = new FluidVaultT1Open();

        vaults = getT1Vaults();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_withdraw_part() public {
        bool isDirect = false;
        bool takeMaxUint256 = false;
        uint256 initialSupplyAmountUSD = 50000;
        uint256 withdrawAmountUSD = 30000;
        _baseTest(isDirect, takeMaxUint256, initialSupplyAmountUSD, withdrawAmountUSD);
    }
    function test_should_withdraw_direct_action() public {
        bool isDirect = true;
        bool takeMaxUint256 = false;
        uint256 initialSupplyAmountUSD = 50000;
        uint256 withdrawAmountUSD = 30000;
        _baseTest(isDirect, takeMaxUint256, initialSupplyAmountUSD, withdrawAmountUSD);
    }
    function test_should_max_withdraw() public {
        bool isDirect = false;
        bool takeMaxUint256 = true;
        uint256 initialSupplyAmountUSD = 50000;
        uint256 withdrawAmountUSD = type(uint256).max;
        _baseTest(isDirect, takeMaxUint256, initialSupplyAmountUSD, withdrawAmountUSD);
    }
    function _baseTest(
        bool _isDirect,
        bool _takeMaxUint256,
        uint256 _initialSupplyAmountUSD,
        uint256 _withdrawAmountUSD
    ) internal {
        for (uint256 i = 0; i < vaults.length; ++i) {

            uint256 nftId = executeFluidVaultT1Open(
                address(vaults[i]),
                _initialSupplyAmountUSD,
                0,
                wallet,
                address(openContract)
            );

            IFluidVaultT1.ConstantViews memory constants = vaults[i].constantsView();
            bool isNativeWithdraw = constants.supplyToken == TokenUtils.ETH_ADDR;

            uint256 withdrawAmount = _takeMaxUint256
                ? type(uint256).max
                : amountInUSDPrice(isNativeWithdraw ? TokenUtils.WETH_ADDR : constants.supplyToken, _withdrawAmountUSD);

            bytes memory executeActionCallData = executeActionCalldata(
                fluidVaultT1WithdrawEncode(
                    address(vaults[i]),
                    nftId,
                    withdrawAmount,
                    sender
                ),
                _isDirect
            );

            (IFluidVaultResolver.UserPosition memory userPositionBefore, ) = 
                IFluidVaultResolver(FLUID_VAULT_RESOLVER).positionByNftId(nftId);

            uint256 senderSupplyTokenBalanceBefore = isNativeWithdraw 
                ? address(sender).balance 
                : balanceOf(constants.supplyToken, sender);
            uint256 walletSupplyTokenBalanceBefore = isNativeWithdraw 
                ? address(walletAddr).balance 
                : balanceOf(constants.supplyToken, walletAddr);

            wallet.execute(address(cut), executeActionCallData, 0);

            uint256 senderSupplyTokenBalanceAfter = isNativeWithdraw 
                ? address(sender).balance 
                : balanceOf(constants.supplyToken, sender);
            uint256 walletSupplyTokenBalanceAfter = isNativeWithdraw
                ? address(walletAddr).balance 
                : balanceOf(constants.supplyToken, walletAddr);

            (IFluidVaultResolver.UserPosition memory userPositionAfter, ) = 
                IFluidVaultResolver(FLUID_VAULT_RESOLVER).positionByNftId(nftId);

            assertEq(walletSupplyTokenBalanceAfter, walletSupplyTokenBalanceBefore);
            if (_takeMaxUint256) {
                assertApproxEqRel(
                    senderSupplyTokenBalanceAfter,
                    senderSupplyTokenBalanceBefore + userPositionBefore.supply,
                    1e15 // 0.1% diff tolerance
                );
                assertEq(userPositionAfter.supply, 0);
            } else {
                assertEq(senderSupplyTokenBalanceAfter, senderSupplyTokenBalanceBefore + withdrawAmount);
                assertApproxEqRel(
                    userPositionAfter.supply,
                    userPositionBefore.supply - withdrawAmount,
                    1e15 // 0.1% diff tolerance
                );
            }
        }
    }
}