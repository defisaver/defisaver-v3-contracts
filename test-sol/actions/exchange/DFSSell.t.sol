// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { RecipeExecutor } from "../../../contracts/core/RecipeExecutor.sol";
import { StrategyModel } from "../../../contracts/core/strategy/StrategyModel.sol";
import { DFSSell } from "../../../contracts/actions/exchange/DFSSell.sol";
import { SellActionHelper } from "../../../contracts/actions/exchange/helpers/SellActionHelper.sol";
import { PullToken } from "../../../contracts/actions/utils/PullToken.sol";
import { SendToken } from "../../../contracts/actions/utils/SendToken.sol";
import { IERC20 } from "../../../contracts/interfaces/token/IERC20.sol";
import { DFSExchangeData } from "../../../contracts/exchangeV3/DFSExchangeData.sol";
import {
    WrapperExchangeRegistry
} from "../../../contracts/exchangeV3/registries/WrapperExchangeRegistry.sol";

import { ActionsUtils } from "../../utils/ActionsUtils.sol";
import { BaseTest } from "../../utils/BaseTest.sol";
import { RegistryUtils } from "../../utils/RegistryUtils.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { Addresses } from "../../utils/helpers/MainnetAddresses.sol";

contract TestDFSSell is ActionsUtils, RegistryUtils, BaseTest {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    DFSSell cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address sender;
    address walletAddr;
    RecipeExecutor recipeExecutor;
    uint24 internal constant UNIV3_FEE = 3000;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        if (!isMainnetSelected()) {
            vm.skip(true, "DFSSell UniV3 tests are mainnet only");
        }

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new DFSSell();
        recipeExecutor = new RecipeExecutor();

        redeploy("DFSSell", address(cut));
        redeploy("PullToken", address(new PullToken()));
        redeploy("SendToken", address(new SendToken()));
        redeploy("RecipeExecutor", address(recipeExecutor));

        WrapperExchangeRegistry exchangeRegistry =
            WrapperExchangeRegistry(Addresses.WRAPPER_EXCHANGE_REGISTRY);
        vm.prank(Addresses.OWNER_ACC);
        exchangeRegistry.addWrapper(Addresses.UNI_V3_WRAPPER);
    }

    function test_should_sell_part_erc20_balance_direct() public {
        uint256 senderBalance = amountInUSDPrice(Addresses.WETH_ADDR, 1000);
        uint256 sellAmount = senderBalance / 2;

        _giveWethAndApprove(senderBalance);

        _executeSellDirect(_wethToDaiSell(sellAmount, sender, sender), 0);

        assertEq(IERC20(Addresses.WETH_ADDR).balanceOf(sender), senderBalance - sellAmount);
        assertGt(IERC20(Addresses.DAI_ADDR).balanceOf(sender), 0);

        assertEq(IERC20(Addresses.WETH_ADDR).balanceOf(walletAddr), 0);
        assertEq(IERC20(Addresses.DAI_ADDR).balanceOf(walletAddr), 0);
    }

    function test_should_sell_full_erc20_balance_direct() public {
        uint256 senderBalance = amountInUSDPrice(Addresses.WETH_ADDR, 1000);

        _giveWethAndApprove(senderBalance);

        _executeSellDirect(_wethToDaiSell(type(uint256).max, sender, sender), 0);

        assertEq(IERC20(Addresses.WETH_ADDR).balanceOf(sender), 0);
        assertGt(IERC20(Addresses.DAI_ADDR).balanceOf(sender), 0);

        assertEq(IERC20(Addresses.WETH_ADDR).balanceOf(walletAddr), 0);
        assertEq(IERC20(Addresses.DAI_ADDR).balanceOf(walletAddr), 0);
    }

    function test_should_sell_part_eth_balance_direct() public {
        uint256 senderEthBalance = 1 ether;
        vm.deal(sender, senderEthBalance);

        uint256 sellAmount = senderEthBalance / 2;

        _executeSellDirect(_ethToDaiSell(sellAmount, sender, sender), sellAmount);

        assertEq(sender.balance, senderEthBalance - sellAmount);
        assertEq(IERC20(Addresses.WETH_ADDR).balanceOf(sender), 0);
        assertGt(IERC20(Addresses.DAI_ADDR).balanceOf(sender), 0);

        assertEq(walletAddr.balance, 0);
        assertEq(IERC20(Addresses.WETH_ADDR).balanceOf(walletAddr), 0);
        assertEq(IERC20(Addresses.DAI_ADDR).balanceOf(walletAddr), 0);
    }

    function test_should_sell_full_eth_balance_direct() public {
        uint256 senderEthBalance = 1 ether;

        vm.deal(sender, senderEthBalance);

        _executeSellDirect(_ethToDaiSell(type(uint256).max, sender, sender), senderEthBalance);

        assertEq(sender.balance, 0);
        assertEq(IERC20(Addresses.WETH_ADDR).balanceOf(sender), 0);
        assertGt(IERC20(Addresses.DAI_ADDR).balanceOf(sender), 0);

        assertEq(walletAddr.balance, 0);
        assertEq(IERC20(Addresses.WETH_ADDR).balanceOf(walletAddr), 0);
        assertEq(IERC20(Addresses.DAI_ADDR).balanceOf(walletAddr), 0);
    }

    function test_should_wrap_eth_to_weth_direct_without_swap() public {
        uint256 senderEthBalance = 1 ether;
        uint256 wrapAmount = senderEthBalance / 2;

        vm.deal(sender, senderEthBalance);

        _executeSellDirect(_ethToWethSell(wrapAmount, sender, sender), wrapAmount);

        assertEq(sender.balance, senderEthBalance - wrapAmount);
        assertEq(IERC20(Addresses.WETH_ADDR).balanceOf(sender), wrapAmount);

        assertEq(walletAddr.balance, 0);
        assertEq(IERC20(Addresses.WETH_ADDR).balanceOf(walletAddr), 0);
    }

    function test_should_unwrap_weth_to_eth_direct_without_swap() public {
        uint256 senderBalance = amountInUSDPrice(Addresses.WETH_ADDR, 1000);
        uint256 unwrapAmount = senderBalance / 2;

        _giveWethAndApprove(senderBalance);

        uint256 senderEthBalanceBefore = sender.balance;

        _executeSellDirect(_wethToEthSell(unwrapAmount, sender, sender), 0);

        assertEq(sender.balance, senderEthBalanceBefore + unwrapAmount);
        assertEq(IERC20(Addresses.WETH_ADDR).balanceOf(sender), senderBalance - unwrapAmount);

        assertEq(walletAddr.balance, 0);
        assertEq(IERC20(Addresses.WETH_ADDR).balanceOf(walletAddr), 0);
    }

    function test_should_sell_part_erc20_balance_recipe() public {
        uint256 senderBalance = amountInUSDPrice(Addresses.WETH_ADDR, 1000);
        uint256 sellAmount = senderBalance / 2;

        _giveWethAndApprove(senderBalance);

        _executePullAndSellRecipe(
            Addresses.WETH_ADDR,
            sender,
            sellAmount,
            _wethToDaiSell(sellAmount, walletAddr, walletAddr)
        );

        assertEq(IERC20(Addresses.WETH_ADDR).balanceOf(sender), senderBalance - sellAmount);
        assertGt(IERC20(Addresses.DAI_ADDR).balanceOf(sender), 0);

        assertEq(IERC20(Addresses.WETH_ADDR).balanceOf(walletAddr), 0);
        assertEq(IERC20(Addresses.DAI_ADDR).balanceOf(walletAddr), 0);
    }

    function test_should_sell_full_erc20_balance_recipe() public {
        uint256 senderBalance = amountInUSDPrice(Addresses.WETH_ADDR, 1000);

        _giveWethAndApprove(senderBalance);

        _executePullAndSellRecipe(
            Addresses.WETH_ADDR,
            sender,
            type(uint256).max,
            _wethToDaiSell(type(uint256).max, walletAddr, walletAddr)
        );

        assertEq(IERC20(Addresses.WETH_ADDR).balanceOf(sender), 0);
        assertGt(IERC20(Addresses.DAI_ADDR).balanceOf(sender), 0);

        assertEq(IERC20(Addresses.WETH_ADDR).balanceOf(walletAddr), 0);
        assertEq(IERC20(Addresses.DAI_ADDR).balanceOf(walletAddr), 0);
    }

    function test_should_sell_part_eth_balance_recipe() public {
        uint256 senderEthBalance = 1 ether;
        vm.deal(sender, senderEthBalance);

        uint256 sellAmount = senderEthBalance / 2;

        _executeSellRecipe(_ethToDaiSell(sellAmount, walletAddr, walletAddr), sellAmount);

        assertEq(sender.balance, senderEthBalance - sellAmount);
        assertEq(IERC20(Addresses.WETH_ADDR).balanceOf(sender), 0);
        assertGt(IERC20(Addresses.DAI_ADDR).balanceOf(sender), 0);

        assertEq(walletAddr.balance, 0);
        assertEq(IERC20(Addresses.WETH_ADDR).balanceOf(walletAddr), 0);
        assertEq(IERC20(Addresses.DAI_ADDR).balanceOf(walletAddr), 0);
    }

    function test_should_sell_full_eth_balance_recipe() public {
        uint256 senderEthBalance = 1 ether;
        vm.deal(sender, senderEthBalance);

        _executeSellRecipe(
            _ethToDaiSell(type(uint256).max, walletAddr, walletAddr), senderEthBalance
        );

        assertEq(sender.balance, 0);
        assertEq(IERC20(Addresses.WETH_ADDR).balanceOf(sender), 0);
        assertGt(IERC20(Addresses.DAI_ADDR).balanceOf(sender), 0);

        assertEq(walletAddr.balance, 0);
        assertEq(IERC20(Addresses.WETH_ADDR).balanceOf(walletAddr), 0);
        assertEq(IERC20(Addresses.DAI_ADDR).balanceOf(walletAddr), 0);
    }

    function test_should_handle_same_asset_sell_as_no_op_in_recipe() public {
        uint256 senderBalance = amountInUSDPrice(Addresses.WETH_ADDR, 1000);
        uint256 sellAmount = senderBalance / 2;

        _giveWethAndApprove(senderBalance);

        _executeSameAssetSellRecipe(sellAmount);

        assertEq(IERC20(Addresses.WETH_ADDR).balanceOf(sender), senderBalance);
        assertEq(IERC20(Addresses.WETH_ADDR).balanceOf(walletAddr), 0);
    }

    function test_should_revert_same_asset_sell_when_from_and_to_are_different() public {
        uint256 senderBalance = amountInUSDPrice(Addresses.WETH_ADDR, 1000);
        uint256 sellAmount = senderBalance / 2;

        give(Addresses.WETH_ADDR, sender, senderBalance);

        vm.expectRevert(
            abi.encodeWithSelector(SellActionHelper.SameAssetsSell_InvalidFromToAddress.selector)
        );
        cut.executeActionDirect(_wethToWethSell(sellAmount, sender, walletAddr));
    }

    function test_should_revert_same_asset_sell_when_from_has_insufficient_balance() public {
        uint256 sellAmount = amountInUSDPrice(Addresses.WETH_ADDR, 1000);

        vm.expectRevert(
            abi.encodeWithSelector(SellActionHelper.SameAssetsSell_InsufficientBalance.selector)
        );
        cut.executeActionDirect(_wethToWethSell(sellAmount, sender, sender));
    }

    function _giveWethAndApprove(uint256 _amount) internal {
        give(Addresses.WETH_ADDR, sender, _amount);
        approveAsSender(sender, Addresses.WETH_ADDR, walletAddr, _amount);
    }

    function _executeSellDirect(bytes memory _params, uint256 _value) internal {
        wallet.execute(address(cut), executeActionCalldata(_params, true), _value);
    }

    function _executePullAndSellRecipe(
        address _token,
        address _from,
        uint256 _pullAmount,
        bytes memory _sellActionParams
    ) internal {
        bytes[] memory actionsCalldata = new bytes[](3);
        actionsCalldata[0] = pullTokenEncode(_token, _from, _pullAmount);
        actionsCalldata[1] = _sellActionParams;
        actionsCalldata[2] = sendTokenEncode(Addresses.DAI_ADDR, sender, type(uint256).max);

        bytes4[] memory actionIds = new bytes4[](3);
        actionIds[0] = bytes4(keccak256("PullToken"));
        actionIds[1] = bytes4(keccak256("DFSSell"));
        actionIds[2] = bytes4(keccak256("SendToken"));

        _executeRecipe("DFSSellPullSellAndSend", actionsCalldata, actionIds, 0);
    }

    function _executeSellRecipe(bytes memory _sellActionParams, uint256 _value) internal {
        bytes[] memory actionsCalldata = new bytes[](2);
        actionsCalldata[0] = _sellActionParams;
        actionsCalldata[1] = sendTokenEncode(Addresses.DAI_ADDR, sender, type(uint256).max);

        bytes4[] memory actionIds = new bytes4[](2);
        actionIds[0] = bytes4(keccak256("DFSSell"));
        actionIds[1] = bytes4(keccak256("SendToken"));

        _executeRecipe("DFSSellAndSend", actionsCalldata, actionIds, _value);
    }

    function _executeSameAssetSellRecipe(uint256 _sellAmount) internal {
        bytes[] memory actionsCalldata = new bytes[](3);
        actionsCalldata[0] = pullTokenEncode(Addresses.WETH_ADDR, sender, _sellAmount);
        actionsCalldata[1] = _wethToWethSell(_sellAmount, walletAddr, walletAddr);
        actionsCalldata[2] = sendTokenEncode(Addresses.WETH_ADDR, sender, type(uint256).max);

        bytes4[] memory actionIds = new bytes4[](3);
        actionIds[0] = bytes4(keccak256("PullToken"));
        actionIds[1] = bytes4(keccak256("DFSSell"));
        actionIds[2] = bytes4(keccak256("SendToken"));

        _executeRecipe("DFSSellSameAssetNoOpAndSend", actionsCalldata, actionIds, 0);
    }

    function _executeRecipe(
        string memory _name,
        bytes[] memory _actionsCalldata,
        bytes4[] memory _actionIds,
        uint256 _value
    ) internal {
        StrategyModel.Recipe memory recipe = _createRecipe(_name, _actionsCalldata, _actionIds);

        wallet.execute(
            address(recipeExecutor),
            abi.encodeWithSelector(RecipeExecutor.executeRecipe.selector, recipe),
            _value
        );
    }

    function _createRecipe(
        string memory _name,
        bytes[] memory _actionsCalldata,
        bytes4[] memory _actionIds
    ) internal pure returns (StrategyModel.Recipe memory recipe) {
        uint8[][] memory paramMapping = new uint8[][](_actionIds.length);
        for (uint256 i = 0; i < _actionIds.length; ++i) {
            paramMapping[i] = new uint8[](MAX_PARAM_MAPPING_SIZE);
        }

        recipe = StrategyModel.Recipe({
            name: _name,
            callData: _actionsCalldata,
            subData: new bytes32[](0),
            actionIds: _actionIds,
            paramMapping: paramMapping
        });
    }

    function _wethToDaiSell(uint256 _amount, address _from, address _to)
        internal
        view
        returns (bytes memory)
    {
        return _sellParams(
            Addresses.WETH_ADDR,
            Addresses.DAI_ADDR,
            Addresses.WETH_ADDR,
            Addresses.DAI_ADDR,
            _amount,
            _from,
            _to
        );
    }

    function _ethToDaiSell(uint256 _amount, address _from, address _to)
        internal
        view
        returns (bytes memory)
    {
        return _sellParams(
            Addresses.ETH_ADDR,
            Addresses.DAI_ADDR,
            Addresses.WETH_ADDR,
            Addresses.DAI_ADDR,
            _amount,
            _from,
            _to
        );
    }

    function _wethToWethSell(uint256 _amount, address _from, address _to)
        internal
        view
        returns (bytes memory)
    {
        return _sellParams(
            Addresses.WETH_ADDR,
            Addresses.WETH_ADDR,
            Addresses.WETH_ADDR,
            Addresses.WETH_ADDR,
            _amount,
            _from,
            _to
        );
    }

    function _ethToWethSell(uint256 _amount, address _from, address _to)
        internal
        view
        returns (bytes memory)
    {
        return _sellParams(
            Addresses.ETH_ADDR,
            Addresses.WETH_ADDR,
            Addresses.WETH_ADDR,
            Addresses.WETH_ADDR,
            _amount,
            _from,
            _to
        );
    }

    function _wethToEthSell(uint256 _amount, address _from, address _to)
        internal
        view
        returns (bytes memory)
    {
        return _sellParams(
            Addresses.WETH_ADDR,
            Addresses.ETH_ADDR,
            Addresses.WETH_ADDR,
            Addresses.WETH_ADDR,
            _amount,
            _from,
            _to
        );
    }

    function _sellParams(
        address _srcAddr,
        address _destAddr,
        address _pathSrcAddr,
        address _pathDestAddr,
        uint256 _amount,
        address _from,
        address _to
    ) internal view returns (bytes memory) {
        DFSExchangeData.OffchainData memory offchain;

        DFSExchangeData.ExchangeData memory exchangeData = DFSExchangeData.ExchangeData({
            srcAddr: _srcAddr,
            destAddr: _destAddr,
            srcAmount: _amount,
            destAmount: 0,
            minPrice: 0,
            dfsFeeDivider: 0,
            user: msg.sender,
            wrapper: Addresses.UNI_V3_WRAPPER,
            wrapperData: abi.encodePacked(_pathSrcAddr, UNIV3_FEE, _pathDestAddr),
            offchainData: offchain
        });

        return abi.encode(DFSSell.Params({ exchangeData: exchangeData, from: _from, to: _to }));
    }
}
