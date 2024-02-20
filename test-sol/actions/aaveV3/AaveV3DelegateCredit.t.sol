// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { AaveV3DelegateCredit } from "../../../contracts/actions/aaveV3/AaveV3DelegateCredit.sol";
import { AaveV3Helper } from "../../../contracts/actions/aaveV3/helpers/AaveV3Helper.sol";
import { IL2PoolV3 } from "../../../contracts/interfaces/aaveV3/IL2PoolV3.sol";
import { DataTypes } from "../../../contracts/interfaces/aaveV3/DataTypes.sol";

import { TokenAddresses } from "../../TokenAddresses.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { ActionsUtils } from "../../utils/ActionsUtils.sol";

contract TestAaveV3DelegateCredit is AaveV3Helper, ActionsUtils, SmartWallet {
    
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV3DelegateCredit cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    IL2PoolV3 pool;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        SmartWallet.setUp();
        cut = new AaveV3DelegateCredit();
        pool = getLendingPool(DEFAULT_AAVE_MARKET);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_delegate_credit_amount_to_alice() public {
        uint256 amount = 100000;
        bool isL2Direct = false;
        _delegateCredit(amount, isL2Direct);
    }

    function test_should_delegate_credit_amount_to_alice_l2_direct() public {
        uint256 amount = 1;
        bool isL2Direct = true;
        _delegateCredit(amount, isL2Direct);
    }

    function test_should_delegate_credit_maxUnit256_to_alice() public {
        uint256 amount = type(uint256).max;
        bool isL2Direct = false;
        _delegateCredit(amount, isL2Direct);
    }

    function testFuzz_encode_decode_inputs_no_market(
        uint256 _amount,
        address _delegatee,
        uint16 _assetId,
        uint8 _rateMode
    ) public {
        AaveV3DelegateCredit.Params memory params = AaveV3DelegateCredit.Params({
            amount: _amount,
            delegatee: _delegatee,
            assetId: _assetId,
            rateMode: _rateMode,
            useDefaultMarket: true,
            market: DEFAULT_AAVE_MARKET
        });
        _assertParams(params);
    }

    function testFuzz_encode_decode_inputs_no_market(
        uint256 _amount,
        address _delegatee,
        uint16 _assetId,
        uint8 _rateMode,
        address _market
    ) public {
        AaveV3DelegateCredit.Params memory params = AaveV3DelegateCredit.Params({
            amount: _amount,
            delegatee: _delegatee,
            assetId: _assetId,
            rateMode: _rateMode,
            useDefaultMarket: false,
            market: _market
        });
        _assertParams(params);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _assertParams(AaveV3DelegateCredit.Params memory _params) private {
        bytes memory encodedInputWithoutSelector = removeSelector(cut.encodeInputs(_params));
        AaveV3DelegateCredit.Params memory decodedParams = cut.decodeInputs(encodedInputWithoutSelector);

        assertEq(_params.amount, decodedParams.amount);
        assertEq(_params.delegatee, decodedParams.delegatee);
        assertEq(_params.assetId, decodedParams.assetId);
        assertEq(_params.rateMode, decodedParams.rateMode);
        assertEq(_params.useDefaultMarket, decodedParams.useDefaultMarket);
        assertEq(_params.market, decodedParams.market);
    }

    function _delegateCredit(uint256 _amount, bool _isL2Direct) internal {
        DataTypes.ReserveData memory wethData = pool.getReserveData(TokenAddresses.WETH_ADDR);

        uint256 availableCreditDelegationForAliceBefore = cut.getCreditDelegation(
            DEFAULT_AAVE_MARKET,
            wethData.id,
            uint8(DataTypes.InterestRateMode.VARIABLE),
            walletAddr,
            alice
        );

        if (_isL2Direct) {
            AaveV3DelegateCredit.Params memory params = AaveV3DelegateCredit.Params({
                amount: _amount,
                delegatee: alice,
                assetId: wethData.id,
                rateMode: uint8(DataTypes.InterestRateMode.VARIABLE),
                useDefaultMarket: true,
                market: DEFAULT_AAVE_MARKET
            });
            executeByWallet(address(cut), cut.encodeInputs(params), 0);
        }
        else {
            bytes memory paramsCalldata = aaveV3DelegateCreditEncode(
                _amount,
                alice,
                wethData.id,
                uint8(DataTypes.InterestRateMode.VARIABLE),
                true,
                address(0)
            );

            bytes memory _calldata = abi.encodeWithSelector(
                AaveV3DelegateCredit.executeAction.selector,
                paramsCalldata,
                subData,
                paramMapping,
                returnValues
            );

            executeByWallet(address(cut), _calldata, 0);
        }

        uint256 availableCreditDelegationForAliceAfter = cut.getCreditDelegation(
            DEFAULT_AAVE_MARKET,
            wethData.id,
            uint8(DataTypes.InterestRateMode.VARIABLE),
            walletAddr,
            alice
        );

        assertEq(availableCreditDelegationForAliceBefore, 0);
        assertEq(availableCreditDelegationForAliceAfter, _amount);
    }
}
