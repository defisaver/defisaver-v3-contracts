// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { AaveV3SetEMode } from "../../../contracts/actions/aaveV3/AaveV3SetEMode.sol";
import { AaveV3Supply } from "../../../contracts/actions/aaveV3/AaveV3Supply.sol";
import { AaveV3Helper } from "../../../contracts/actions/aaveV3/helpers/AaveV3Helper.sol";
import { IL2PoolV3 } from "../../../contracts/interfaces/aaveV3/IL2PoolV3.sol";
import { DataTypes } from "../../../contracts/interfaces/aaveV3/DataTypes.sol";

import { TokenAddresses } from "../../TokenAddresses.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { AaveV3ExecuteActions } from "../../utils/executeActions/AaveV3ExecuteActions.sol";

contract TestAaveV3SetEMode is AaveV3Helper, AaveV3ExecuteActions {
    
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV3SetEMode cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    IL2PoolV3 pool;
    address aaveV3SupplyContractAddr;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("AaveV3SetEMode");
        SmartWallet.setUp();
        cut = new AaveV3SetEMode();
        pool = getLendingPool(DEFAULT_AAVE_MARKET);
        aaveV3SupplyContractAddr = address(new AaveV3Supply());
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_change_eMode() public {
        uint256 suppyAmount = amountInUSDPrice(TokenAddresses.WETH_ADDR, 100_000);
        _supplyWeth(suppyAmount);

        bool isL2Direct = false;
        uint8 ethCorrelatedCategoryId = 1;

        _setEMode(ethCorrelatedCategoryId, isL2Direct);
    }

    function test_should_change_eMode_l2_direct() public {
        uint256 suppyAmount = amountInUSDPrice(TokenAddresses.WETH_ADDR, 100_000);
        _supplyWeth(suppyAmount);

        bool isL2Direct = true;
        uint8 ethCorrelatedCategoryId = 1;

        _setEMode(ethCorrelatedCategoryId, isL2Direct);
    }

    function testFuzz_encode_decode_inputs_no_market(uint8 _categoryId) public {
        AaveV3SetEMode.Params memory params = AaveV3SetEMode.Params({
            categoryId: _categoryId,
            useDefaultMarket: true,
            market: DEFAULT_AAVE_MARKET
        });
        _assertParams(params);
    }

    function testFuzz_encode_decode_inputs(uint8 _categoryId, address _market) public {
        AaveV3SetEMode.Params memory params = AaveV3SetEMode.Params({
            categoryId: _categoryId,
            useDefaultMarket: false,
            market: _market
        });
        _assertParams(params);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _assertParams(AaveV3SetEMode.Params memory _params) private {
        bytes memory encodedInputWithoutSelector = removeSelector(cut.encodeInputs(_params));
        AaveV3SetEMode.Params memory decodedParams = cut.decodeInputs(encodedInputWithoutSelector);

        assertEq(decodedParams.categoryId, _params.categoryId);
        assertEq(decodedParams.useDefaultMarket, _params.useDefaultMarket);
        assertEq(decodedParams.market, _params.market);
    }

    function _setEMode(uint8 _categoryId, bool _isL2Direct) internal {

        uint256 categoryIdBefore = pool.getUserEMode(walletAddr);

        if (_isL2Direct) {
            AaveV3SetEMode.Params memory params = AaveV3SetEMode.Params({
                categoryId: _categoryId,
                useDefaultMarket: true,
                market: address(0)
            });
            executeByWallet(address(cut), cut.encodeInputs(params), 0);
        }
        else {
            bytes memory paramsCalldata = aaveV3SetEModeEncode(
                _categoryId,
                true,
                address(0)
            );

            bytes memory _calldata = abi.encodeWithSelector(
                AaveV3SetEMode.executeAction.selector,
                paramsCalldata,
                subData,
                paramMapping,
                returnValues
            );

            executeByWallet(address(cut), _calldata, 0);
        }

        uint256 categoryIdAfter = pool.getUserEMode(walletAddr);

        assertEq(categoryIdBefore, 0);
        assertEq(categoryIdAfter, _categoryId);
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
