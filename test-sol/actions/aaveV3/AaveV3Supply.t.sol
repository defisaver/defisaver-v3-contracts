// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { AaveV3Supply } from "../../../contracts/actions/aaveV3/AaveV3Supply.sol";
import { AaveV3Helper } from "../../../contracts/actions/aaveV3/helpers/AaveV3Helper.sol";
import { IL2PoolV3 } from "../../../contracts/interfaces/aaveV3/IL2PoolV3.sol";
import { IAaveProtocolDataProvider } from "../../../contracts/interfaces/aaveV3/IAaveProtocolDataProvider.sol";
import { DataTypes } from "../../../contracts/interfaces/aaveV3/DataTypes.sol";

import { TokenAddresses } from "../../TokenAddresses.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { ActionsUtils } from "../../utils/ActionsUtils.sol";
import { BaseTest } from "../../utils/BaseTest.sol";

contract TestAaveV3Supply is AaveV3Helper, ActionsUtils, BaseTest {
    
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV3Supply cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address sender;
    address walletAddr;
    IL2PoolV3 pool;
    IAaveProtocolDataProvider dataProvider;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("AaveV3Supply");
        initTestPairs("AaveV3");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new AaveV3Supply();
        pool = getLendingPool(DEFAULT_AAVE_MARKET);
        dataProvider = getDataProvider(DEFAULT_AAVE_MARKET);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_supply() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshot();

            TestPair memory testPair = testPairs[i];

            uint256 supplyAmount = amountInUSDPrice(testPair.supplyAsset, 100000);

            give(testPair.supplyAsset, sender, supplyAmount);
            approveAsSender(sender, testPair.supplyAsset, walletAddr, supplyAmount);

            _supply(testPair.supplyAsset, supplyAmount, false);

            vm.revertTo(snapshotId);
        }
    }
    
    function test_should_supply_maxUint256() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshot();

            TestPair memory testPair = testPairs[i];

            uint256 senderRealBalance = amountInUSDPrice(testPair.supplyAsset, 100000);
            give(testPair.supplyAsset, sender, senderRealBalance);
            approveAsSender(sender, testPair.supplyAsset, walletAddr, senderRealBalance);

            uint256 supplyAmount = type(uint256).max;

            _supply(testPair.supplyAsset, supplyAmount, false);

            vm.revertTo(snapshotId);
        }
    }

     function test_should_supply_on_direct_action_l2() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshot();

            TestPair memory testPair = testPairs[i];

            uint256 supplyAmount = amountInUSDPrice(testPair.supplyAsset, 100000);

            give(testPair.supplyAsset, sender, supplyAmount);
            approveAsSender(sender, testPair.supplyAsset, walletAddr, supplyAmount);

            _supply(testPair.supplyAsset, supplyAmount, true);

            vm.revertTo(snapshotId);
        }
    }

    struct TestSupplyOnBehalfOfHelperData {
        uint256 senderBalance;
        uint256 walletATokenBalance;
        uint256 onBehalfOfAddrATokenBalance;
    }

    function test_should_supply_onBehalfOf() public {
        address onBehalfOf = alice;
        for (uint256 i = 0; i < testPairs.length; ++i) {
            DataTypes.ReserveData memory supplyTokenData = pool.getReserveData(testPairs[i].supplyAsset);

            uint256 supplyAmount = amountInUSDPrice(testPairs[i].supplyAsset, 100000);

            give(testPairs[i].supplyAsset, sender, supplyAmount);
            approveAsSender(sender, testPairs[i].supplyAsset, walletAddr, supplyAmount);

            TestSupplyOnBehalfOfHelperData memory dataBefore = TestSupplyOnBehalfOfHelperData({
                senderBalance: balanceOf(testPairs[i].supplyAsset, sender),
                walletATokenBalance: balanceOf(supplyTokenData.aTokenAddress, walletAddr),
                onBehalfOfAddrATokenBalance: balanceOf(supplyTokenData.aTokenAddress, onBehalfOf)
            });

            bytes memory paramsCallData = aaveV3SupplyEncode(
                supplyAmount,
                sender,
                supplyTokenData.id,
                true,
                true,
                address(0),
                onBehalfOf
            );

            bytes memory _calldata = abi.encodeWithSelector(
                AaveV3Supply.executeAction.selector,
                paramsCallData,
                subData,
                paramMapping,
                returnValues
            );

            wallet.execute(address(cut), _calldata, 0);

            TestSupplyOnBehalfOfHelperData memory dataAfter = TestSupplyOnBehalfOfHelperData({
                senderBalance: balanceOf(testPairs[i].supplyAsset, sender),
                walletATokenBalance: balanceOf(supplyTokenData.aTokenAddress, walletAddr),
                onBehalfOfAddrATokenBalance: balanceOf(supplyTokenData.aTokenAddress, onBehalfOf)
            });

            assertEq(dataBefore.senderBalance - supplyAmount, dataAfter.senderBalance);
            assertEq(dataBefore.walletATokenBalance, 0);
            assertEq(dataAfter.walletATokenBalance, 0);
            assertGe(dataAfter.onBehalfOfAddrATokenBalance, dataBefore.onBehalfOfAddrATokenBalance + supplyAmount);
            
            (uint256 walletCurrentATokenBalance,,,,,,,,) = dataProvider.getUserReserveData(testPairs[i].supplyAsset, walletAddr);
            assertEq(walletCurrentATokenBalance, 0);
            (uint256 onBehalfOfAddrCurrentATokenBalance,,,,,,,,) = dataProvider.getUserReserveData(testPairs[i].supplyAsset, onBehalfOf);
            assertGe(onBehalfOfAddrCurrentATokenBalance, supplyAmount);    
        }
    }

    function testFuzz_encode_decode_inputs_no_market_no_onbehalf(
        uint256 _amount,
        address _from,
        uint16 _assetId
    ) public {
        AaveV3Supply.Params memory params = AaveV3Supply.Params({
            amount: _amount,
            from: _from,
            assetId: _assetId,
            enableAsColl: true,
            useDefaultMarket: true,
            useOnBehalf: false,
            market: DEFAULT_AAVE_MARKET,
            onBehalf: address(0)
        });
        _assertParams(params);
    }

    function testFuzz_encode_decode_inputs_no_onbehalf(
        uint256 _amount,
        address _from,
        uint16 _assetId,
        address _market
    ) public {
        AaveV3Supply.Params memory params = AaveV3Supply.Params({
            amount: _amount,
            from: _from,
            assetId: _assetId,
            enableAsColl: true,
            useDefaultMarket: false,
            useOnBehalf: false,
            market: _market,
            onBehalf: address(0)
        });
        _assertParams(params);
    }

    function testFuzz_encode_decode_inputs_no_market(
        uint256 _amount,
        address _from,
        uint16 _assetId,
        address _onBehalf
    ) public {
        AaveV3Supply.Params memory params = AaveV3Supply.Params({
            amount: _amount,
            from: _from,
            assetId: _assetId,
            enableAsColl: true,
            useDefaultMarket: true,
            useOnBehalf: true,
            market: DEFAULT_AAVE_MARKET,
            onBehalf: _onBehalf
        });
        _assertParams(params);
    }

    function testFuzz_encode_decode_inputs(
        uint256 _amount,
        address _from,
        uint16 _assetId,
        address _onBehalf,
        address _market
    ) public {
        AaveV3Supply.Params memory params = AaveV3Supply.Params({
            amount: _amount,
            from: _from,
            assetId: _assetId,
            enableAsColl: true,
            useDefaultMarket: false,
            useOnBehalf: true,
            market: _market,
            onBehalf: _onBehalf
        });
        _assertParams(params);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                       HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _assertParams(AaveV3Supply.Params memory _params) private {
        bytes memory encodedInputWithoutSelector = removeSelector(cut.encodeInputs(_params));
        AaveV3Supply.Params memory decodedParams = cut.decodeInputs(encodedInputWithoutSelector);
        
        assertEq(_params.amount, decodedParams.amount);
        assertEq(_params.from, decodedParams.from);
        assertEq(_params.assetId, decodedParams.assetId);
        assertEq(_params.enableAsColl, decodedParams.enableAsColl);
        assertEq(_params.useDefaultMarket, decodedParams.useDefaultMarket);
        assertEq(_params.useOnBehalf, decodedParams.useOnBehalf);
        assertEq(_params.market, decodedParams.market);
        assertEq(_params.onBehalf, decodedParams.onBehalf);
    }

    function _supply(address _supplyAsset, uint256 _supplyAmount, bool _isL2Direct) public {
        DataTypes.ReserveData memory supplyTokenData = pool.getReserveData(_supplyAsset);

        uint256 realAmountToSupply = _supplyAmount == type(uint256).max ? 
            balanceOf(_supplyAsset, sender) : 
            _supplyAmount;

        uint256 senderBalanceBefore = balanceOf(_supplyAsset, sender);
        uint256 walletATokenBalanceBefore = balanceOf(supplyTokenData.aTokenAddress, walletAddr);
        
        if (_isL2Direct) {
            AaveV3Supply.Params memory params = AaveV3Supply.Params({
                amount: _supplyAmount,
                from: sender,
                assetId: supplyTokenData.id,
                enableAsColl: true,
                useDefaultMarket: true,
                useOnBehalf: false,
                market: address(0),
                onBehalf: address(0)
            });
            
            wallet.execute(address(cut), cut.encodeInputs(params), 0);

        } else {
            bytes memory paramsCallData = aaveV3SupplyEncode(
                _supplyAmount,
                sender,
                supplyTokenData.id,
                true,
                false,
                address(0),
                address(0)
            );

            bytes memory _calldata = abi.encodeWithSelector(
                AaveV3Supply.executeAction.selector,
                paramsCallData,
                subData,
                paramMapping,
                returnValues
            );

            wallet.execute(address(cut), _calldata, 0);
        }

        uint256 senderBalanceAfter = balanceOf(_supplyAsset, sender);
        uint256 walletATokenBalanceAfter = balanceOf(supplyTokenData.aTokenAddress, walletAddr);
        
        assertEq(senderBalanceBefore - realAmountToSupply, senderBalanceAfter);
        assertGe(walletATokenBalanceAfter, walletATokenBalanceBefore + realAmountToSupply);

        (uint256 currentATokenBalance,,,,,,,,bool usageAsCollateral) = 
            dataProvider.getUserReserveData(_supplyAsset, walletAddr);
        assertGe(currentATokenBalance, realAmountToSupply);
        assertTrue(usageAsCollateral);
    }
}
