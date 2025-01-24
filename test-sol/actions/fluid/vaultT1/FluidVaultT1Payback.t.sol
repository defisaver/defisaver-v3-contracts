
import { IFluidVaultT1 } from "../../../../contracts/interfaces/fluid/IFluidVaultT1.sol";
import { IFluidVaultResolver } from "../../../../contracts/interfaces/fluid/IFluidVaultResolver.sol";
import { IFluidVaultFactory } from "../../../../contracts/interfaces/fluid/IFluidVaultFactory.sol";
import { FluidVaultT1Open } from "../../../../contracts/actions/fluid/vaultT1/FluidVaultT1Open.sol";
import { FluidVaultT1Payback } from "../../../../contracts/actions/fluid/vaultT1/FluidVaultT1Payback.sol";

import { FluidExecuteActions } from "../../../utils/executeActions/FluidExecuteActions.sol";
import { SmartWallet } from "../../../utils/SmartWallet.sol";
import { console } from "forge-std/console.sol";

contract TestFluidVaultT1Payback is FluidExecuteActions {

    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    FluidVaultT1Payback cut;

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

        cut = new FluidVaultT1Payback();
        openContract = new FluidVaultT1Open();

        vaults = getT1Vaults();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_payback_part() public {
        bool isDirect = false;
        bool isMaxPayback = false;
        uint256 initialSupplyAmountUSD = 50000;
        uint256 initialBorrowAmountUSD = 30000;
        uint256 paybackAmountUSD = 10000;
        _baseTest(
            isDirect,
            isMaxPayback,
            initialSupplyAmountUSD,
            initialBorrowAmountUSD,
            paybackAmountUSD
        );
    }
    function test_should_payback_action_direct() public {
        bool isDirect = true;
        bool isMaxPayback = false;
        uint256 initialSupplyAmountUSD = 50000;
        uint256 initialBorrowAmountUSD = 30000;
        uint256 paybackAmountUSD = 10000;
        _baseTest(
            isDirect,
            isMaxPayback,
            initialSupplyAmountUSD,
            initialBorrowAmountUSD,
            paybackAmountUSD
        );
    }
    function test_should_payback_with_different_amounts() public {
        bool isDirect = false;
        bool isMaxPayback = false;

        uint256[] memory paybackAmounts = new uint256[](5);
        paybackAmounts[0] = 99;
        paybackAmounts[1] = 9982;
        paybackAmounts[2] = 29178;
        paybackAmounts[3] = 3333;
        paybackAmounts[4] = 31112;

        uint256 initialSupplyAmountUSD = 50000;
        uint256 initialBorrowAmountUSD = 31113;

        for (uint256 i = 0; i < paybackAmounts.length; ++i) {
            _baseTest(
                isDirect,
                isMaxPayback,
                initialSupplyAmountUSD,
                initialBorrowAmountUSD,
                paybackAmounts[i]
            );
        }
    }
    function test_should_max_payback() public {
        bool isDirect = false;
        bool isMaxPayback = true;

        uint256 initSupplyAmountsUSD = 100000;
        uint256[] memory initBorrowAmountsUSD = new uint256[](5);
        initBorrowAmountsUSD[0] = 50001;
        initBorrowAmountsUSD[1] = 31122;
        initBorrowAmountsUSD[2] = 100;
        initBorrowAmountsUSD[3] = 22567;
        initBorrowAmountsUSD[4] = 999;

        for (uint256 i = 0; i < initBorrowAmountsUSD.length; ++i) {
            _baseTest(
                isDirect,
                isMaxPayback,
                initSupplyAmountsUSD,
                initBorrowAmountsUSD[i],
                type(uint256).max
            );
        }
    }
    function _baseTest(
        bool _isDirect,
        bool _isMaxPayback,
        uint256 _initialSupplyAmountUSD,
        uint256 _initialBorrowAmountUSD,
        uint256 _paybackAmountUSD
    ) internal {
        for (uint256 i = 0; i < vaults.length; ++i) {
            uint256 nftId = executeFluidVaultT1Open(
                address(vaults[i]),
                _initialSupplyAmountUSD,
                _initialBorrowAmountUSD,
                wallet,
                address(openContract)
            );

            IFluidVaultT1.ConstantViews memory constants = vaults[i].constantsView();

            (IFluidVaultResolver.UserPosition memory userPositionBefore, ) = 
                IFluidVaultResolver(FLUID_VAULT_RESOLVER).positionByNftId(nftId);

            uint256 paybackAmount = _isMaxPayback
                ? userPositionBefore.borrow * 1001 / 1000 // add 0.1% buffer
                : amountInUSDPrice(constants.borrowToken, _paybackAmountUSD);

            give(constants.borrowToken, sender, paybackAmount);
            approveAsSender(sender, constants.borrowToken, walletAddr, 0); // To handle Tether
            approveAsSender(sender, constants.borrowToken, walletAddr, paybackAmount);

            bytes memory executeActionCallData = executeActionCalldata(
                fluidVaultT1PaybackEncode(
                    address(vaults[i]),
                    nftId,
                    paybackAmount,
                    sender
                ),
                _isDirect
            );

            uint256 senderBorrowTokenBalanceBefore = balanceOf(constants.borrowToken, sender);
            uint256 walletBorrowTokenBalanceBefore = balanceOf(constants.borrowToken, walletAddr);

            wallet.execute(address(cut), executeActionCallData, 0);

            uint256 senderBorrowTokenBalanceAfter = balanceOf(constants.borrowToken, sender);
            uint256 walletBorrowTokenBalanceAfter = balanceOf(constants.borrowToken, walletAddr);

            (IFluidVaultResolver.UserPosition memory userPositionAfter, ) = 
                IFluidVaultResolver(FLUID_VAULT_RESOLVER).positionByNftId(nftId);

            // make sure no dust is left on wallet
            assertEq(walletBorrowTokenBalanceAfter, walletBorrowTokenBalanceBefore);
            
            if (_isMaxPayback) {
                assertApproxEqRel(
                    senderBorrowTokenBalanceAfter,
                    senderBorrowTokenBalanceBefore - userPositionBefore.borrow,
                    1e15 // 0.1% tolerance
                );
                assertEq(userPositionAfter.borrow, 0);
            } else {
                assertEq(senderBorrowTokenBalanceAfter, senderBorrowTokenBalanceBefore - paybackAmount);
                assertApproxEqRel(
                    userPositionAfter.borrow,
                    userPositionBefore.borrow - paybackAmount,
                    1e15 // 0.1% tolerance
                );
            }
        }
    }
}