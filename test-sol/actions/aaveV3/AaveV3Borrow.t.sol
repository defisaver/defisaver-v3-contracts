// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { AaveV3Borrow } from "../../../contracts/actions/aaveV3/AaveV3Borrow.sol";
import { AaveV3Supply } from "../../../contracts/actions/aaveV3/AaveV3Supply.sol";
import { AaveV3Helper } from "../../../contracts/actions/aaveV3/helpers/AaveV3Helper.sol";
import { AaveV3RatioHelper } from "../../../contracts/actions/aaveV3/helpers/AaveV3RatioHelper.sol";
import { IL2PoolV3 } from "../../../contracts/interfaces/aaveV3/IL2PoolV3.sol";
import { IAaveProtocolDataProvider } from "../../../contracts/interfaces/aaveV3/IAaveProtocolDataProvider.sol";
import { DataTypes } from "../../../contracts/interfaces/aaveV3/DataTypes.sol";

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
    SmartWallet wallet;
    address walletAddr;
    address sender;

    IL2PoolV3 pool;
    IAaveProtocolDataProvider dataProvider;
    address aaveV3SupplyContractAddr;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("AaveV3Borrow");
        initTestPairs("AaveV3");
        
        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new AaveV3Borrow();
        pool = getLendingPool(DEFAULT_AAVE_MARKET);
        dataProvider = getDataProvider(DEFAULT_AAVE_MARKET);
        aaveV3SupplyContractAddr = address(new AaveV3Supply());
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_borrow() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshot();

            TestPair memory pair = testPairs[i];
            uint256 supplyAmount = amountInUSDPrice(pair.supplyAsset, 100_000);
            _supply(pair.supplyAsset, supplyAmount);

            uint256 borrowAmount = amountInUSDPrice(pair.borrowAsset, 40_000);
            _borrow(borrowAmount, pair.borrowAsset, false);

            vm.revertTo(snapshotId);
        }
    }

    function testFail_should_borrow_maxUint256() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshot();

            TestPair memory pair = testPairs[i];
            uint256 supplyAmount = amountInUSDPrice(pair.supplyAsset, 100_000);
            _supply(pair.supplyAsset, supplyAmount);

            uint256 borrowAmount = type(uint256).max;
            _borrow(borrowAmount, pair.borrowAsset, false);

            vm.revertTo(snapshotId);
        }
    }

    function test_should_borrow_l2_direct() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshot();

            TestPair memory pair = testPairs[i];
            uint256 supplyAmount = amountInUSDPrice(pair.supplyAsset, 100_000);
            _supply(pair.supplyAsset, supplyAmount);

            uint256 borrowAmount = amountInUSDPrice(pair.borrowAsset, 40_000);
            _borrow(borrowAmount, pair.borrowAsset, true);

            vm.revertTo(snapshotId);
        }
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

    function _borrow(uint256 _borrowAmount, address _borrowAsset, bool _isL2Direct) internal {
        DataTypes.ReserveData memory borrowAssetData = pool.getReserveData(_borrowAsset);        

        uint256 senderBalanceBefore = balanceOf(_borrowAsset, sender);
        uint256 walletSafetyRatioBefore = getSafetyRatio(DEFAULT_AAVE_MARKET, walletAddr);

        if (_isL2Direct) {
            AaveV3Borrow.Params memory params = AaveV3Borrow.Params({
                amount: _borrowAmount,
                to: sender,
                rateMode: uint8(DataTypes.InterestRateMode.VARIABLE),
                assetId: borrowAssetData.id,
                useDefaultMarket: true,
                useOnBehalf: false,
                market: address(0),
                onBehalf: address(0)
            });
            wallet.execute(address(cut), cut.encodeInputs(params), 0);
        }
        else {
            bytes memory paramsCalldata = aaveV3BorrowEncode(
                _borrowAmount,
                sender,
                uint8(DataTypes.InterestRateMode.VARIABLE),
                borrowAssetData.id,
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

            wallet.execute(address(cut), _calldata, 0);
        }
        
        uint256 senderBalanceAfter = balanceOf(_borrowAsset, sender);
        uint256 walletSafetyRatioAfter = getSafetyRatio(DEFAULT_AAVE_MARKET, walletAddr);

        assertEq(senderBalanceAfter, senderBalanceBefore + _borrowAmount);
        assertEq(walletSafetyRatioBefore, 0);
        assertGe(walletSafetyRatioAfter, 0);
    }

    function _supply(address _asset, uint256 _amount) internal {
        DataTypes.ReserveData memory assetData = pool.getReserveData(_asset);
        AaveV3Supply.Params memory supplyParams = AaveV3Supply.Params({
            amount: _amount,
            from: sender,
            assetId: assetData.id,
            enableAsColl: true,
            useDefaultMarket: true,
            useOnBehalf: false,
            market: address(0),
            onBehalf: address(0)
        });

        executeAaveV3Supply(supplyParams, _asset, wallet, false, aaveV3SupplyContractAddr);
    }
}
