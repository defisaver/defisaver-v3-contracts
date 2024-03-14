// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { AaveV3Payback } from "../../../contracts/actions/aaveV3/AaveV3Payback.sol";   
import { AaveV3RatioHelper } from "../../../contracts/actions/aaveV3/helpers/AaveV3RatioHelper.sol";
import { DataTypes } from "../../../contracts/interfaces/aaveV3/DataTypes.sol";

import { TokenAddresses } from "../../TokenAddresses.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { AaveV3PositionCreator } from "../../utils/positions/AaveV3PositionCreator.sol";


contract TestAaveV3Payback is AaveV3RatioHelper, AaveV3PositionCreator {
    
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV3Payback cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("AaveV3Payback");
        initTestPairs("AaveV3");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        AaveV3PositionCreator.setUp();
        cut = new AaveV3Payback();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_payback_part_of_debt() public {
        bool useMaxUint = false;
        bool isL2Direct = false;
        _test_payback(useMaxUint, isL2Direct);
    }

    function test_should_payback_maxUint256_amount_debt() public {
        bool useMaxUint = true;
        bool isL2Direct = false;
        _test_payback(useMaxUint, isL2Direct);
    }

    function test_should_payback_part_of_debt_l2_direct() public {
        bool useMaxUint = false;
        bool isL2Direct = true;
        _test_payback(useMaxUint, isL2Direct);
    }

    function _test_payback(bool _useMaxUint, bool _isL2Direct) public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 snapshotId = vm.snapshot();

            PositionParams memory positionParams = PositionParams({
                collAddr: testPairs[i].supplyAsset,
                collAmount: amountInUSDPrice(testPairs[i].supplyAsset, 100_000),
                debtAddr: testPairs[i].borrowAsset,
                debtAmount: amountInUSDPrice(testPairs[i].borrowAsset, 40_000)
            });

            createAaveV3Position(positionParams, wallet);

            uint256 paybackAmount = _useMaxUint ? type(uint256).max : amountInUSDPrice(testPairs[i].borrowAsset, 10_000);
            _payback(positionParams, paybackAmount, _isL2Direct);

            vm.revertTo(snapshotId);
        }
    }

    function testFuzz_encode_decode_inputs_no_market_no_onbehalf(
        uint256 _amount,
        address _from,
        uint8 _rateMode,
        uint16 _assetId
    ) public {
        AaveV3Payback.Params memory params = AaveV3Payback.Params({
            amount: _amount,
            from: _from,
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
        address _from,
        uint8 _rateMode,
        uint16 _assetId,
        address _market
    ) public {
        AaveV3Payback.Params memory params = AaveV3Payback.Params({
            amount: _amount,
            from: _from,
            rateMode: _rateMode,
            assetId: _assetId,
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
        uint8 _rateMode,
        uint16 _assetId,
        address _onBehalf
    ) public {
        AaveV3Payback.Params memory params = AaveV3Payback.Params({
            amount: _amount,
            from: _from,
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
        address _from,
        uint8 _rateMode,
        uint16 _assetId,
        address _market,
        address _onBehalf
    ) public {
        AaveV3Payback.Params memory params = AaveV3Payback.Params({
            amount: _amount,
            from: _from,
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
    function _assertParams(AaveV3Payback.Params memory _params) private {
        bytes memory encodedInputWithoutSelector = removeSelector(cut.encodeInputs(_params));
        AaveV3Payback.Params memory decodedParams = cut.decodeInputs(encodedInputWithoutSelector);
        
        assertEq(_params.amount, decodedParams.amount);
        assertEq(_params.from, decodedParams.from);
        assertEq(_params.rateMode, decodedParams.rateMode);
        assertEq(_params.assetId, decodedParams.assetId);
        assertEq(_params.useDefaultMarket, decodedParams.useDefaultMarket);
        assertEq(_params.useOnBehalf, decodedParams.useOnBehalf);
        assertEq(_params.market, decodedParams.market);
        assertEq(_params.onBehalf, decodedParams.onBehalf);
    }

    function _payback(PositionParams memory _positionParams, uint256 _paybackAmount, bool _isL2Direct) internal {
        DataTypes.ReserveData memory reserveData = pool.getReserveData(_positionParams.debtAddr);
        uint16 debtAssetId = reserveData.id;
        address debtVariableTokenAddr = reserveData.variableDebtTokenAddress;

        uint256 walletSafetyRatioBefore = getSafetyRatio(DEFAULT_AAVE_MARKET, walletAddr);
        uint256 walletVariableDebtBefore = balanceOf(debtVariableTokenAddr, walletAddr);

        if (_paybackAmount == type(uint256).max) {
            give(_positionParams.debtAddr, sender, walletVariableDebtBefore * 2);
            approveAsSender(sender, _positionParams.debtAddr, walletAddr, walletVariableDebtBefore * 2);
        } else {
            give(_positionParams.debtAddr, sender, _paybackAmount);
            approveAsSender(sender, _positionParams.debtAddr, walletAddr, _paybackAmount);
        }

        uint256 senderBalanceBefore = balanceOf(_positionParams.debtAddr, sender);

        if (_isL2Direct) {
            AaveV3Payback.Params memory params = AaveV3Payback.Params({
                amount: _paybackAmount,
                from: sender,
                rateMode: uint8(DataTypes.InterestRateMode.VARIABLE),
                assetId: debtAssetId,
                useDefaultMarket: true,
                useOnBehalf: false,
                market: address(0),
                onBehalf: address(0)
            });
            wallet.execute(address(cut), cut.encodeInputs(params), 0);
        } 
        else {
            bytes memory paramsCalldata = aaveV3PaybackEncode(
                _paybackAmount,
                sender,
                uint8(DataTypes.InterestRateMode.VARIABLE),
                debtAssetId,
                true,
                false,
                address(0),
                address(0)
            );

            bytes memory _calldata = abi.encodeWithSelector(
                AaveV3Payback.executeAction.selector,
                paramsCalldata,
                subData,
                paramMapping,
                returnValues
            );
            wallet.execute(address(cut), _calldata, 0);
        }

        uint256 senderBalanceAfter = balanceOf(_positionParams.debtAddr, sender);
        uint256 walletSafetyRatioAfter = getSafetyRatio(DEFAULT_AAVE_MARKET, walletAddr);
        uint256 walletVariableDebtAfter = balanceOf(debtVariableTokenAddr, walletAddr);

        uint256 maxATokenIncreaseTolerance = 10 wei;

        if (_paybackAmount == type(uint256).max) {
            assertApproxEqAbs(senderBalanceAfter, senderBalanceBefore - walletVariableDebtBefore, maxATokenIncreaseTolerance);
            assertEq(walletVariableDebtAfter, 0);
            assertEq(walletSafetyRatioAfter, 0);
        } else {
            assertEq(senderBalanceAfter, senderBalanceBefore - _paybackAmount);
            assertApproxEqAbs(walletVariableDebtAfter, walletVariableDebtBefore - _paybackAmount, maxATokenIncreaseTolerance);
            assertGt(walletSafetyRatioAfter, walletSafetyRatioBefore);
        }
    }
}
