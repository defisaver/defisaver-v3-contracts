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
 
contract TestAaveV3Supply is AaveV3Helper, SmartWallet, ActionsUtils {
    
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV3Supply cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    IL2PoolV3 pool;
    IAaveProtocolDataProvider dataProvider;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        SmartWallet.setUp();
        cut = new AaveV3Supply();
        pool = getLendingPool(DEFAULT_AAVE_MARKET);
        dataProvider = getDataProvider(DEFAULT_AAVE_MARKET);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_supply_10_weth() public {
        uint256 supplyAmount = 10 ether;
        bool isL2Direct = false;

        giveBob(TokenAddresses.WETH_ADDR, supplyAmount);
        approveAsBob(TokenAddresses.WETH_ADDR, walletAddr, supplyAmount);

        _supply(supplyAmount, isL2Direct);
    }
    
    function test_should_supply_maxUint256_weth() public {
        uint256 bobRealBalance = 10 ether;
        bool isL2Direct = false;

        giveBob(TokenAddresses.WETH_ADDR, bobRealBalance);
        approveAsBob(TokenAddresses.WETH_ADDR, walletAddr, bobRealBalance);

        _supply(type(uint256).max, isL2Direct);
    }

     function test_should_supply_10_weth_on_direct_action_l2() public {
        uint256 supplyAmount = 10 ether;
        bool isL2Direct = true;

        giveBob(TokenAddresses.WETH_ADDR, supplyAmount);
        approveAsBob(TokenAddresses.WETH_ADDR, walletAddr, supplyAmount);

        _supply(supplyAmount, isL2Direct);
    }

    function test_should_supply_onBehalfOf_alice() public {
        DataTypes.ReserveData memory wethData = pool.getReserveData(TokenAddresses.WETH_ADDR);

        uint256 supplyAmount = 10 ether;

        giveBob(TokenAddresses.WETH_ADDR, supplyAmount);
        approveAsBob(TokenAddresses.WETH_ADDR, walletAddr, supplyAmount);

        uint256 bobBalanceBefore = bobBalance(TokenAddresses.WETH_ADDR);
        uint256 walletAtokenBalanceBefore = balanceOf(wethData.aTokenAddress, walletAddr);
        uint256 aliceAtokenBalanceBefore = balanceOf(wethData.aTokenAddress, alice);

        bytes memory paramsCallData = aaveV3SupplyEncode(
            supplyAmount,
            bob,
            wethData.id,
            true,
            true,
            address(0),
            alice
        );

        bytes memory _calldata = abi.encodeWithSelector(
            AaveV3Supply.executeAction.selector,
            paramsCallData,
            subData,
            paramMapping,
            returnValues
        );

        executeByWallet(address(cut), _calldata, 0);

        uint256 bobBalanceAfter = bobBalance(TokenAddresses.WETH_ADDR);
        uint256 walletAtokenBalanceAfter = balanceOf(wethData.aTokenAddress, walletAddr);
        uint256 aliceAtokenBalanceAfter = balanceOf(wethData.aTokenAddress, alice);
        
        assertEq(bobBalanceBefore - supplyAmount, bobBalanceAfter);
        assertEq(walletAtokenBalanceBefore, 0);
        assertEq(walletAtokenBalanceAfter, 0);
        assertGe(aliceAtokenBalanceAfter, aliceAtokenBalanceBefore + supplyAmount);

        (uint256 walletCurrentAtokenBalance,,,,,,,,) = dataProvider.getUserReserveData(TokenAddresses.WETH_ADDR, walletAddr);
        assertEq(walletCurrentAtokenBalance, 0);

        (uint256 aliceCurrentAtokenBalance,,,,,,,,) = dataProvider.getUserReserveData(TokenAddresses.WETH_ADDR, alice);
        assertGe(aliceCurrentAtokenBalance, supplyAmount);
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

    function _supply(uint256 _supplyAmount, bool _isL2Direct) public {
        DataTypes.ReserveData memory wethData = pool.getReserveData(TokenAddresses.WETH_ADDR);

        uint256 realAmountToSupply = _supplyAmount == type(uint256).max ? 
            bobBalance(TokenAddresses.WETH_ADDR) : 
            _supplyAmount;

        uint256 bobBalanceBefore = bobBalance(TokenAddresses.WETH_ADDR);
        uint256 walletAtokenBalanceBefore = balanceOf(wethData.aTokenAddress, walletAddr);
        
        if (_isL2Direct) {
            AaveV3Supply.Params memory params = AaveV3Supply.Params({
                amount: _supplyAmount,
                from: bob,
                assetId: wethData.id,
                enableAsColl: true,
                useDefaultMarket: true,
                useOnBehalf: false,
                market: address(0),
                onBehalf: address(0)
            });
            
            executeByWallet(address(cut), cut.encodeInputs(params), 0);

        } else {
            bytes memory paramsCallData = aaveV3SupplyEncode(
                _supplyAmount,
                bob,
                wethData.id,
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

            executeByWallet(address(cut), _calldata, 0);
        }

        uint256 bobBalanceAfter = bobBalance(TokenAddresses.WETH_ADDR);
        uint256 walletATokenBalanceAfter = balanceOf(wethData.aTokenAddress, walletAddr);
        
        assertEq(bobBalanceBefore - realAmountToSupply, bobBalanceAfter);
        assertGe(walletATokenBalanceAfter, walletAtokenBalanceBefore + realAmountToSupply);

        (uint256 currentATokenBalance,,,,,,,,bool usageAsCollateral) = 
            dataProvider.getUserReserveData(TokenAddresses.WETH_ADDR, walletAddr);
        assertGe(currentATokenBalance, realAmountToSupply);
        assertTrue(usageAsCollateral);
    }
}
