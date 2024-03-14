// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { AaveV3ATokenPayback } from "../../../contracts/actions/aaveV3/AaveV3ATokenPayback.sol";   
import { AaveV3Supply } from "../../../contracts/actions/aaveV3/AaveV3Supply.sol";   
import { AaveV3RatioHelper } from "../../../contracts/actions/aaveV3/helpers/AaveV3RatioHelper.sol";
import { DataTypes } from "../../../contracts/interfaces/aaveV3/DataTypes.sol";

import { TokenAddresses } from "../../TokenAddresses.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { AaveV3PositionCreator } from "../../utils/positions/AaveV3PositionCreator.sol";

contract TestAaveV3ATokenPayback is AaveV3RatioHelper, AaveV3PositionCreator {
    
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV3ATokenPayback cut;

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
        forkMainnet("AaveV3ATokenPayback");
        initTestPairs("AaveV3");

        wallet = new SmartWallet(bob);
        walletAddr = wallet.walletAddr();
        sender = wallet.owner();

        AaveV3PositionCreator.setUp();
        cut = new AaveV3ATokenPayback();
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

    function testFuzz_encode_decode_inputs_no_market(
        uint256 _amount,
        address _from,
        uint8 _rateMode,
        uint16 _assetId
    ) public {
        AaveV3ATokenPayback.Params memory params = AaveV3ATokenPayback.Params({
            amount: _amount,
            from: _from,
            rateMode: _rateMode,
            assetId: _assetId,
            useDefaultMarket: true,
            market: DEFAULT_AAVE_MARKET
        });
        _assertParams(params);
    }

    function testFuzz_encode_decode_inputs(
        uint256 _amount,
        address _from,
        uint8 _rateMode,
        uint16 _assetId,
        address _market
    ) public {
        AaveV3ATokenPayback.Params memory params = AaveV3ATokenPayback.Params({
            amount: _amount,
            from: _from,
            rateMode: _rateMode,
            assetId: _assetId,
            useDefaultMarket: false,
            market: _market
        });
        _assertParams(params);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _assertParams(AaveV3ATokenPayback.Params memory _params) private {
        bytes memory encodedInputWithoutSelector = removeSelector(cut.encodeInputs(_params));
        AaveV3ATokenPayback.Params memory decodedParams = cut.decodeInputs(encodedInputWithoutSelector);
        
        assertEq(_params.amount, decodedParams.amount);
        assertEq(_params.from, decodedParams.from);
        assertEq(_params.rateMode, decodedParams.rateMode);
        assertEq(_params.assetId, decodedParams.assetId);
        assertEq(_params.useDefaultMarket, decodedParams.useDefaultMarket);
        assertEq(_params.market, decodedParams.market);
    }

    function _payback(PositionParams memory _positionParams, uint256 _paybackAmount, bool _isL2Direct) internal {
        DataTypes.ReserveData memory reserveData = pool.getReserveData(_positionParams.debtAddr);
        uint16 debtAssetId = reserveData.id;
        address debtVariableTokenAddr = reserveData.variableDebtTokenAddress;
        address debtATokenAddr = reserveData.aTokenAddress;

        uint256 walletSafetyRatioBefore = getSafetyRatio(DEFAULT_AAVE_MARKET, walletAddr);
        uint256 walletVariableDebtBefore = balanceOf(debtVariableTokenAddr, walletAddr);

        if (_paybackAmount == type(uint256).max) {
            giveATokensToSender(_positionParams.debtAddr, walletVariableDebtBefore * 2);
            approveAsSender(sender, debtATokenAddr, walletAddr, walletVariableDebtBefore * 2);
        } else {
            giveATokensToSender(_positionParams.debtAddr, _paybackAmount);
            approveAsSender(sender, debtATokenAddr, walletAddr, _paybackAmount);
        }

        uint256 senderBalanceBefore = balanceOf(debtATokenAddr, sender);

        if (_isL2Direct) {
            AaveV3ATokenPayback.Params memory params = AaveV3ATokenPayback.Params({
                amount: _paybackAmount,
                from: sender,
                rateMode: uint8(DataTypes.InterestRateMode.VARIABLE),
                assetId: debtAssetId,
                useDefaultMarket: true,
                market: address(0)
            });
            wallet.execute(address(cut), cut.encodeInputs(params), 0);
        } 
        else {
            bytes memory paramsCalldata = aaveV3ATokenPaybackEncode(
                _paybackAmount,
                sender,
                uint8(DataTypes.InterestRateMode.VARIABLE),
                debtAssetId,
                true,
                address(0)
            );

            bytes memory _calldata = abi.encodeWithSelector(
                AaveV3ATokenPayback.executeAction.selector,
                paramsCalldata,
                subData,
                paramMapping,
                returnValues
            );
            wallet.execute(address(cut), _calldata, 0);
        }

        uint256 senderBalanceAfter = balanceOf(debtATokenAddr, sender);
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

    /// @dev Foundry has problems with handling aave tokens, we can't just use vm.deal
    /// @dev https://github.com/foundry-rs/forge-std/issues/140
    function giveATokensToSender(address _debtToken, uint256 _amount) internal {
        // first give sender some debt tokens
        give(_debtToken, sender, _amount * 2);

        // approve aave pool to pull tokens
        approveAsSender(sender, _debtToken, address(pool), _amount);

        // supply directly, so that sender gets aTokens
        vm.prank(sender);
        pool.supply(_debtToken, _amount, sender, AAVE_REFERRAL_CODE);
        stopPrank();
    }
}
