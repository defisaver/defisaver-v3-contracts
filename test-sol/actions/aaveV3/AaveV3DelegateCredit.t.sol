// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { AaveV3DelegateCredit } from "../../../contracts/actions/aaveV3/AaveV3DelegateCredit.sol";
import { AaveV3Helper } from "../../../contracts/actions/aaveV3/helpers/AaveV3Helper.sol";
import { IL2PoolV3 } from "../../../contracts/interfaces/aaveV3/IL2PoolV3.sol";
import { DataTypes } from "../../../contracts/interfaces/aaveV3/DataTypes.sol";

import { BaseTest } from "../../utils/BaseTest.sol";
import { TokenAddresses } from "../../TokenAddresses.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { ActionsUtils } from "../../utils/ActionsUtils.sol";

contract TestAaveV3DelegateCredit is AaveV3Helper, ActionsUtils, BaseTest {
    
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV3DelegateCredit cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;
    IL2PoolV3 pool;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("AaveV3DelegateCredit");
        initTestPairs("AaveV3");
        
        wallet = new SmartWallet(bob);
        walletAddr = wallet.walletAddr();
        sender = wallet.owner();

        cut = new AaveV3DelegateCredit();
        pool = getLendingPool(DEFAULT_AAVE_MARKET);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_delegate_credit_amount() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 amount = 100000;
            bool isL2Direct = false;
            address delegatee = alice;
            _delegateCredit(testPairs[i].supplyAsset, amount, delegatee, isL2Direct);
        }
    }

    function test_should_delegate_credit_amount_l2_direct() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 amount = 1;
            bool isL2Direct = true;
            address delegatee = alice;
            _delegateCredit(testPairs[i].supplyAsset, amount, delegatee, isL2Direct);
        }
    }

    function test_should_delegate_credit_maxUnit256() public {
        for (uint256 i = 0; i < testPairs.length; ++i) {
            uint256 amount = type(uint256).max;
            bool isL2Direct = false;
            address delegatee = alice;
            _delegateCredit(testPairs[i].supplyAsset, amount, delegatee, isL2Direct);
        }
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

    function _delegateCredit(address _token, uint256 _amount, address _delegatee, bool _isL2Direct) internal {
        DataTypes.ReserveData memory tokenData = pool.getReserveData(_token);

        uint256 availableCreditDelegationForDelegateeBefore = cut.getCreditDelegation(
            DEFAULT_AAVE_MARKET,
            tokenData.id,
            uint8(DataTypes.InterestRateMode.VARIABLE),
            walletAddr,
            _delegatee
        );

        if (_isL2Direct) {
            AaveV3DelegateCredit.Params memory params = AaveV3DelegateCredit.Params({
                amount: _amount,
                delegatee: _delegatee,
                assetId: tokenData.id,
                rateMode: uint8(DataTypes.InterestRateMode.VARIABLE),
                useDefaultMarket: true,
                market: DEFAULT_AAVE_MARKET
            });
            wallet.execute(address(cut), cut.encodeInputs(params), 0);
        }
        else {
            bytes memory paramsCalldata = aaveV3DelegateCreditEncode(
                _amount,
                _delegatee,
                tokenData.id,
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

            wallet.execute(address(cut), _calldata, 0);
        }

        uint256 availableCreditDelegationForDelegateeAfter = cut.getCreditDelegation(
            DEFAULT_AAVE_MARKET,
            tokenData.id,
            uint8(DataTypes.InterestRateMode.VARIABLE),
            walletAddr,
            _delegatee
        );

        assertEq(availableCreditDelegationForDelegateeBefore, 0);
        assertEq(availableCreditDelegationForDelegateeAfter, _amount);
    }
}
