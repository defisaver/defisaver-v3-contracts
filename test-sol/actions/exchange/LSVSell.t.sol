// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { LSVSell } from "../../../contracts/actions/exchange/LSVSell.sol";
import { DFSExchangeCore } from "../../../contracts/exchangeV3/DFSExchangeCore.sol";
import { DFSExchangeData } from "../../../contracts/exchangeV3/DFSExchangeData.sol";
import { ILiquidityPool } from "../../../contracts/interfaces/protocols/etherFi/ILiquidityPool.sol";
import { IWeEth } from "../../../contracts/interfaces/protocols/etherFi/IWeEth.sol";

import { EtherFiHelper } from "../../../contracts/actions/etherfi/helpers/EtherFiHelper.sol";
import { ActionsUtils } from "../../utils/ActionsUtils.sol";
import { BaseTest } from "../../utils/BaseTest.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { Addresses } from "../../utils/helpers/MainnetAddresses.sol";

contract LSVSellHarness is LSVSell {
    receive() external payable { }
}

contract TestLSVSell is ActionsUtils, BaseTest, EtherFiHelper {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    LSVSell cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address sender;
    address walletAddr;

    uint256 internal constant SRC_AMOUNT = 1 ether;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        if (!isMainnetSelected()) {
            vm.skip(true, "LSVSell tests are mainnet only");
        }

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new LSVSellHarness();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_deposit_weth_on_lido_if_it_gives_better_rate() public {
        _giveWethAndApprove(SRC_AMOUNT, walletAddr);

        uint256 senderWethBefore = balanceOf(Addresses.WETH_ADDR, sender);
        uint256 senderWstEthBefore = balanceOf(Addresses.WSTETH_ADDR, sender);

        _executeLSVSell(_lsvSellParams(Addresses.WETH_ADDR, Addresses.WSTETH_ADDR, SRC_AMOUNT));

        assertEq(balanceOf(Addresses.WETH_ADDR, sender), senderWethBefore - SRC_AMOUNT);
        assertGt(balanceOf(Addresses.WSTETH_ADDR, sender), senderWstEthBefore);
        assertEq(balanceOf(Addresses.WETH_ADDR, walletAddr), 0);
        assertEq(balanceOf(Addresses.WSTETH_ADDR, walletAddr), 0);
    }

    function test_should_wrap_steth_on_lido_if_it_gives_better_rate() public {
        _giveStEthAndApprove(SRC_AMOUNT, walletAddr);

        uint256 senderStEthBefore = balanceOf(Addresses.STETH_ADDR, sender);
        uint256 senderWstEthBefore = balanceOf(Addresses.WSTETH_ADDR, sender);

        _executeLSVSell(_lsvSellParams(Addresses.STETH_ADDR, Addresses.WSTETH_ADDR, SRC_AMOUNT));

        uint256 senderStEthAfter = balanceOf(Addresses.STETH_ADDR, sender);
        assertApproxEqAbs(senderStEthBefore - senderStEthAfter, SRC_AMOUNT, 1);
        assertGt(balanceOf(Addresses.WSTETH_ADDR, sender), senderWstEthBefore);
        assertEq(balanceOf(Addresses.STETH_ADDR, walletAddr), 0);
        assertEq(balanceOf(Addresses.WSTETH_ADDR, walletAddr), 0);
    }

    function test_should_deposit_weth_on_ether_fi_if_it_gives_better_rate() public {
        _giveWethAndApprove(SRC_AMOUNT, walletAddr);

        uint256 senderWethBefore = balanceOf(Addresses.WETH_ADDR, sender);
        uint256 senderWeEthBefore = balanceOf(WEETH_ADDR, sender);

        _executeLSVSell(_lsvSellParams(Addresses.WETH_ADDR, WEETH_ADDR, SRC_AMOUNT));

        assertEq(balanceOf(Addresses.WETH_ADDR, sender), senderWethBefore - SRC_AMOUNT);
        assertGt(balanceOf(WEETH_ADDR, sender), senderWeEthBefore);
        assertEq(balanceOf(Addresses.WETH_ADDR, walletAddr), 0);
        assertEq(balanceOf(WEETH_ADDR, walletAddr), 0);
    }

    function test_should_wrap_eeth_on_ether_fi_if_it_gives_better_rate() public {
        _giveEethAndApprove(SRC_AMOUNT, walletAddr);

        uint256 senderEethBefore = balanceOf(EETH_ADDR, sender);
        uint256 senderWeEthBefore = balanceOf(WEETH_ADDR, sender);

        _executeLSVSell(_lsvSellParams(EETH_ADDR, WEETH_ADDR, SRC_AMOUNT));

        uint256 senderEethAfter = balanceOf(EETH_ADDR, sender);
        assertApproxEqAbs(senderEethBefore - senderEethAfter, SRC_AMOUNT, 1);
        assertGt(balanceOf(WEETH_ADDR, sender), senderWeEthBefore);
        assertEq(balanceOf(EETH_ADDR, walletAddr), 0);
        assertEq(balanceOf(WEETH_ADDR, walletAddr), 0);
    }

    function test_should_revert_when_ether_fi_shortcut_output_is_below_min_price() public {
        _giveWethAndApprove(SRC_AMOUNT, address(cut));

        vm.mockCall(
            WEETH_ADDR,
            abi.encodeWithSelector(IWeEth.getWeETHByeETH.selector, 1 ether),
            abi.encode(1 ether)
        );
        vm.mockCall(
            ETHER_FI_LIQUIDITY_POOL,
            SRC_AMOUNT,
            abi.encodeWithSelector(ILiquidityPool.deposit.selector),
            abi.encode(0)
        );
        vm.mockCall(WEETH_ADDR, abi.encodeWithSelector(IWeEth.wrap.selector, 0), abi.encode(0));

        vm.expectRevert(
            abi.encodeWithSelector(DFSExchangeCore.SlippageHitError.selector, 0, SRC_AMOUNT)
        );
        cut.executeAction(
            _lsvSellParams(Addresses.WETH_ADDR, WEETH_ADDR, SRC_AMOUNT, 1 ether),
            subData,
            paramMapping,
            returnValues
        );
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _giveWethAndApprove(uint256 _amount, address _spender) internal {
        give(Addresses.WETH_ADDR, sender, _amount);
        approveAsSender(sender, Addresses.WETH_ADDR, _spender, _amount);
    }

    function _giveStEthAndApprove(uint256 _amount, address _spender) internal {
        vm.deal(sender, _amount);
        vm.prank(sender);
        (bool sent,) = payable(Addresses.STETH_ADDR).call{ value: _amount }("");
        require(sent, "Failed to stake ETH with Lido");

        approveAsSender(sender, Addresses.STETH_ADDR, _spender, _amount);
    }

    function _giveEethAndApprove(uint256 _amount, address _spender) internal {
        vm.deal(sender, _amount);
        vm.prank(sender);
        ILiquidityPool(ETHER_FI_LIQUIDITY_POOL).deposit{ value: _amount }();

        approveAsSender(sender, EETH_ADDR, _spender, _amount);
    }

    function _executeLSVSell(bytes memory _params) internal {
        wallet.execute(address(cut), executeActionCalldata(_params, false), 0);
    }

    function _lsvSellParams(address _srcAddr, address _destAddr, uint256 _amount)
        internal
        view
        returns (bytes memory)
    {
        return _lsvSellParams(_srcAddr, _destAddr, _amount, 0);
    }

    function _lsvSellParams(
        address _srcAddr,
        address _destAddr,
        uint256 _amount,
        uint256 _minPrice
    ) internal view returns (bytes memory) {
        DFSExchangeData.OffchainData memory offchain;

        DFSExchangeData.ExchangeData memory exchangeData = DFSExchangeData.ExchangeData({
            srcAddr: _srcAddr,
            destAddr: _destAddr,
            srcAmount: _amount,
            destAmount: 0,
            minPrice: _minPrice,
            dfsFeeDivider: 0,
            user: msg.sender,
            wrapper: address(0),
            wrapperData: bytes(""),
            offchainData: offchain
        });

        return abi.encode(LSVSell.Params({ exchangeData: exchangeData, from: sender, to: sender }));
    }
}
