// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { AaveV3Borrow } from "../../../contracts/actions/aaveV3/AaveV3Borrow.sol";
import { AaveV3Supply } from "../../../contracts/actions/aaveV3/AaveV3Supply.sol";
import { AaveV3Helper } from "../../../contracts/actions/aaveV3/helpers/AaveV3Helper.sol";
import { AaveV3RatioHelper } from "../../../contracts/actions/aaveV3/helpers/AaveV3RatioHelper.sol";
import { IL2PoolV3 } from "../../../contracts/interfaces/aaveV3/IL2PoolV3.sol";
import { IAaveProtocolDataProvider } from "../../../contracts/interfaces/aaveV3/IAaveProtocolDataProvider.sol";
import { DataTypes } from "../../../contracts/interfaces/aaveV3/DataTypes.sol";

import { TokenAddresses } from "../../TokenAddresses.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { AaveV3ExecuteActions } from "../../utils/executeActions/AaveV3ExecuteActions.sol";

contract TestAaveV3Borrow is AaveV3Helper, AaveV3RatioHelper, AaveV3ExecuteActions {
    
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV3Borrow cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    IL2PoolV3 pool;
    IAaveProtocolDataProvider dataProvider;
    address aaveV3SupplyContractAddr;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        SmartWallet.setUp();
        cut = new AaveV3Borrow();
        pool = getLendingPool(DEFAULT_AAVE_MARKET);
        dataProvider = getDataProvider(DEFAULT_AAVE_MARKET);
        aaveV3SupplyContractAddr = address(new AaveV3Supply());
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_borrow_dai_on_weth_supplied() public {
        uint256 suppyAmount = amountInUSDPrice(TokenAddresses.WETH_ADDR, 100_000);
        _supplyWeth(suppyAmount);

        uint256 borrowAmount = amountInUSDPrice(TokenAddresses.DAI_ADDR, 40_000);
        bool isL2Direct = false;
        _borrowDai(borrowAmount, isL2Direct);
    }

    function testFail_should_borrow_maxUint256_dai() public {
        uint256 suppyAmount = amountInUSDPrice(TokenAddresses.WETH_ADDR, 100_000);
        _supplyWeth(suppyAmount);

        uint256 borrowAmount = type(uint256).max;
        bool isL2Direct = false;

        _borrowDai(borrowAmount, isL2Direct);
    }

    function test_should_borrow_dai_on_weth_supplied_l2_direct() public {
        uint256 suppyAmount = amountInUSDPrice(TokenAddresses.WETH_ADDR, 100_000);
        _supplyWeth(suppyAmount);

        uint256 borrowAmount = amountInUSDPrice(TokenAddresses.DAI_ADDR, 40_000);
        bool isL2Direct = true;
        _borrowDai(borrowAmount, isL2Direct);
    }

    function testFuzz_encode_decode_inputs_no_market_no_onbehalf(
        uint256 _amount,
        address _to,
        uint8 _rateMode,
        uint16 _assetId
    ) public {
        AaveV3Borrow.Params memory params = AaveV3Borrow.Params({
            amount: _amount,
            to: _to,
            rateMode: _rateMode,
            assetId: _assetId,
            useDefaultMarket: true,
            useOnBehalf: false,
            market: DEFAULT_AAVE_MARKET,
            onBehalf: address(0)
        });
        _assertParams(params);
    }

    function testFuzz_encode_decode_inputs_no_onbehalf(
        uint256 _amount,
        address _to,
        uint8 _rateMode,
        uint16 _assetId,
        address _market
    ) public {
        AaveV3Borrow.Params memory params = AaveV3Borrow.Params({
            amount: _amount,
            to: _to,
            rateMode: _rateMode,
            assetId: _assetId,
            useDefaultMarket: false,
            useOnBehalf: true,
            market: _market,
            onBehalf: address(0)
        });
        _assertParams(params);
    }

    function testFuzz_encode_decode_no_market(
        uint256 _amount,
        address _to,
        uint8 _rateMode,
        uint16 _assetId,
        address _onBehalf
    ) public {
        AaveV3Borrow.Params memory params = AaveV3Borrow.Params({
            amount: _amount,
            to: _to,
            rateMode: _rateMode,
            assetId: _assetId,
            useDefaultMarket: true,
            useOnBehalf: true,
            market: DEFAULT_AAVE_MARKET,
            onBehalf: _onBehalf
        });
        _assertParams(params);
    }

    function testFuzz_encode_decode_inputs(
        uint256 _amount,
        address _to,
        uint8 _rateMode,
        uint16 _assetId,
        address _market,
        address _onBehalf
    ) public {
        AaveV3Borrow.Params memory params = AaveV3Borrow.Params({
            amount: _amount,
            to: _to,
            rateMode: _rateMode,
            assetId: _assetId,
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
    function _assertParams(AaveV3Borrow.Params memory _params) private {
        bytes memory encodedInputWithoutSelector = removeSelector(cut.encodeInputs(_params));
        AaveV3Borrow.Params memory decodedParams = cut.decodeInputs(encodedInputWithoutSelector);
        
        assertEq(_params.amount, decodedParams.amount);
        assertEq(_params.to, decodedParams.to);
        assertEq(_params.rateMode, decodedParams.rateMode);
        assertEq(_params.assetId, decodedParams.assetId);
        assertEq(_params.useDefaultMarket, decodedParams.useDefaultMarket);
        assertEq(_params.useOnBehalf, decodedParams.useOnBehalf);
        assertEq(_params.market, decodedParams.market);
        assertEq(_params.onBehalf, decodedParams.onBehalf);
    }

    function _borrowDai(uint256 _borrowAmount, bool _isL2Direct) internal {
        DataTypes.ReserveData memory daiData = pool.getReserveData(TokenAddresses.DAI_ADDR);        

        uint256 bobBalanceBefore = bobBalance(TokenAddresses.DAI_ADDR);
        uint256 walletSafetyRatioBefore = getSafetyRatio(DEFAULT_AAVE_MARKET, walletAddr);

        if (_isL2Direct) {
            AaveV3Borrow.Params memory params = AaveV3Borrow.Params({
                amount: _borrowAmount,
                to: bob,
                rateMode: uint8(DataTypes.InterestRateMode.VARIABLE),
                assetId: daiData.id,
                useDefaultMarket: true,
                useOnBehalf: false,
                market: address(0),
                onBehalf: address(0)
            });
            executeByWallet(address(cut), cut.encodeInputs(params), 0);
        }
        else {
            bytes memory paramsCalldata = aaveV3BorrowEncode(
                _borrowAmount,
                bob,
                uint8(DataTypes.InterestRateMode.VARIABLE),
                daiData.id,
                true,
                false,
                address(0),
                address(0)
            );

            bytes memory _calldata = abi.encodeWithSelector(
                AaveV3Borrow.executeAction.selector,
                paramsCalldata,
                subData,
                paramMapping,
                returnValues
            );

            executeByWallet(address(cut), _calldata, 0);
        }
        
        uint256 bobBalanceAfter = bobBalance(TokenAddresses.DAI_ADDR);
        uint256 walletSafetyRatioAfter = getSafetyRatio(DEFAULT_AAVE_MARKET, walletAddr);

        assertEq(bobBalanceAfter, bobBalanceBefore + _borrowAmount);
        assertEq(walletSafetyRatioBefore, 0);
        assertGe(walletSafetyRatioAfter, 0);
    }

    function _supplyWeth(uint256 _amount) internal {
        DataTypes.ReserveData memory wethData = pool.getReserveData(TokenAddresses.WETH_ADDR);
        AaveV3Supply.Params memory supplyParams = AaveV3Supply.Params({
            amount: _amount,
            from: bob,
            assetId: wethData.id,
            enableAsColl: true,
            useDefaultMarket: true,
            useOnBehalf: false,
            market: address(0),
            onBehalf: address(0)
        });

        executeAaveV3Supply(supplyParams, TokenAddresses.WETH_ADDR, false, aaveV3SupplyContractAddr);
    }
}
