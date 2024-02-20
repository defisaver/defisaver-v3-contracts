// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { AaveV3ATokenPayback } from "../../../contracts/actions/aaveV3/AaveV3ATokenPayback.sol";   
import { AaveV3Supply } from "../../../contracts/actions/aaveV3/AaveV3Supply.sol";   
import { AaveV3RatioHelper } from "../../../contracts/actions/aaveV3/helpers/AaveV3RatioHelper.sol";
import { DataTypes } from "../../../contracts/interfaces/aaveV3/DataTypes.sol";

import { TokenAddresses } from "../../TokenAddresses.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { AaveV3CdpCreator } from "../../utils/cdp/AaveV3CdpCreator.sol";

contract TestAaveV3ATokenPayback is AaveV3RatioHelper, AaveV3CdpCreator {
    
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV3ATokenPayback cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    CdpParams cdpParams;
    uint16 debtAssetId;
    address debtVariableTokenAddr;
    address debtATokenAddr;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("AaveV3ATokenPayback");
        SmartWallet.setUp();
        AaveV3CdpCreator.setUp();
        cut = new AaveV3ATokenPayback();

        cdpParams = CdpParams({
            collAddr: TokenAddresses.WETH_ADDR,
            collAmount: amountInUSDPrice(TokenAddresses.WETH_ADDR, 100_000),
            debtAddr: TokenAddresses.DAI_ADDR,
            debtAmount: amountInUSDPrice(TokenAddresses.DAI_ADDR, 40_000)
        });

        DataTypes.ReserveData memory reserveData = pool.getReserveData(cdpParams.debtAddr);
        debtAssetId = reserveData.id;
        debtVariableTokenAddr = reserveData.variableDebtTokenAddress;
        debtATokenAddr = reserveData.aTokenAddress;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_payback_part_of_debt() public {
        createAaveV3Cdp(cdpParams);

        uint256 paybackAmount = amountInUSDPrice(TokenAddresses.DAI_ADDR, 10_000);
        bool isL2Direct = false;

        _payback(paybackAmount, isL2Direct);
    }

    function test_should_payback_maxUint256_amount_debt() public {
        createAaveV3Cdp(cdpParams);

        uint256 paybackAmount = type(uint256).max;
        bool isL2Direct = false;

        _payback(paybackAmount, isL2Direct);
    }

    function test_should_payback_part_of_debt_l2_direct() public {
        createAaveV3Cdp(cdpParams);

        uint256 paybackAmount = amountInUSDPrice(TokenAddresses.DAI_ADDR, 10_000);
        bool isL2Direct = true;

        _payback(paybackAmount, isL2Direct);
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

    function _payback(uint256 _paybackAmount, bool _isL2Direct) internal {
        uint256 walletSafetyRatioBefore = getSafetyRatio(DEFAULT_AAVE_MARKET, walletAddr);
        uint256 walletVariableDebtBefore = balanceOf(debtVariableTokenAddr, walletAddr);

        if (_paybackAmount == type(uint256).max) {
            giveATokensToBob(walletVariableDebtBefore * 2);
            approveAsBob(debtATokenAddr, walletAddr, walletVariableDebtBefore * 2);
        } else {
            giveATokensToBob(_paybackAmount);
            approveAsBob(debtATokenAddr, walletAddr, _paybackAmount);
        }

        uint256 bobBalanceBefore = bobBalance(debtATokenAddr);

        if (_isL2Direct) {
            AaveV3ATokenPayback.Params memory params = AaveV3ATokenPayback.Params({
                amount: _paybackAmount,
                from: bob,
                rateMode: uint8(DataTypes.InterestRateMode.VARIABLE),
                assetId: debtAssetId,
                useDefaultMarket: true,
                market: address(0)
            });
            executeByWallet(address(cut), cut.encodeInputs(params), 0);
        } 
        else {
            bytes memory paramsCalldata = aaveV3ATokenPaybackEncode(
                _paybackAmount,
                bob,
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
            executeByWallet(address(cut), _calldata, 0);
        }

        uint256 bobBalanceAfter = bobBalance(debtATokenAddr);
        uint256 walletSafetyRatioAfter = getSafetyRatio(DEFAULT_AAVE_MARKET, walletAddr);
        uint256 walletVariableDebtAfter = balanceOf(debtVariableTokenAddr, walletAddr);

        uint256 maxAtokenIncreaseTollerance = 10 wei;

        if (_paybackAmount == type(uint256).max) {
            assertApproxEqAbs(bobBalanceAfter, bobBalanceBefore - walletVariableDebtBefore, maxAtokenIncreaseTollerance);
            assertEq(walletVariableDebtAfter, 0);
            assertEq(walletSafetyRatioAfter, 0);
        } else {
            assertEq(bobBalanceAfter, bobBalanceBefore - _paybackAmount);
            assertApproxEqAbs(walletVariableDebtAfter, walletVariableDebtBefore - _paybackAmount, maxAtokenIncreaseTollerance);
            assertGt(walletSafetyRatioAfter, walletSafetyRatioBefore);
        }
    }

    /// @dev Foundry has problems with handling aave tokens, we can't just use vm.deal
    /// @dev https://github.com/foundry-rs/forge-std/issues/140
    function giveATokensToBob(uint256 _amount) internal {
        // first give bob some debt tokens
        giveBob(cdpParams.debtAddr, _amount * 2);

        // approve aave pool to pull tokens
        approveAsBob(cdpParams.debtAddr, address(pool), _amount);

        // supply directly, so that bob gets aTokens
        prankBob();
        pool.supply(cdpParams.debtAddr, _amount, bob, AAVE_REFERRAL_CODE);
        stopPrank();
    }
}
