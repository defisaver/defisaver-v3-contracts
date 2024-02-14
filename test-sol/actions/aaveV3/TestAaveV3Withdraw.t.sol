// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { AaveV3Withdraw } from "../../../contracts/actions/aaveV3/AaveV3Withdraw.sol";
import { AaveV3Supply } from "../../../contracts/actions/aaveV3/AaveV3Supply.sol";
import { AaveV3Helper } from "../../../contracts/actions/aaveV3/helpers/AaveV3Helper.sol";
import { IL2PoolV3 } from "../../../contracts/interfaces/aaveV3/IL2PoolV3.sol";
import { IAaveProtocolDataProvider } from "../../../contracts/interfaces/aaveV3/IAaveProtocolDataProvider.sol";
import { DataTypes } from "../../../contracts/interfaces/aaveV3/DataTypes.sol";

import { TokenAddresses } from "../../TokenAddresses.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";
import { AaveV3ExecuteActions } from "../../utils/executeActions/AaveV3ExecuteActions.sol";

contract TestAaveV3Withdraw is AaveV3Helper, AaveV3ExecuteActions {
    
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV3Withdraw cut;

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
        cut = new AaveV3Withdraw();
        pool = getLendingPool(DEFAULT_AAVE_MARKET);
        dataProvider = getDataProvider(DEFAULT_AAVE_MARKET);
        aaveV3SupplyContractAddr = address(new AaveV3Supply());
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_withdraw_part_of_supplied_weth() public {
        uint256 suppyAmount = amountInUSDPrice(TokenAddresses.WETH_ADDR, 100_000);
        _supplyWeth(suppyAmount);

        uint256 withdrawAmount = amountInUSDPrice(TokenAddresses.WETH_ADDR, 50_000);
        bool isL2Direct = false;
        _withdraw(withdrawAmount, isL2Direct);
    }

    function test_should_withdraw_all_supplied_weth() public {
        uint256 suppyAmount = amountInUSDPrice(TokenAddresses.WETH_ADDR, 100_000);
        _supplyWeth(suppyAmount);

        uint256 withdrawAmount = type(uint256).max;
        bool isL2Direct = false;
        _withdraw(withdrawAmount, isL2Direct);
    }

    function test_should_withdraw_part_of_supplied_weth_l2_direct() public {
         uint256 suppyAmount = amountInUSDPrice(TokenAddresses.WETH_ADDR, 100_000);
        _supplyWeth(suppyAmount);

        uint256 withdrawAmount = amountInUSDPrice(TokenAddresses.WETH_ADDR, 50_000);
        bool isL2Direct = true;
        _withdraw(withdrawAmount, isL2Direct);
    }

    function testFuzz_encode_decode_no_market(
        uint16 _assetId,
        uint256 _amount,
        address _to
    ) public {
        AaveV3Withdraw.Params memory params = AaveV3Withdraw.Params({
            assetId: _assetId,
            useDefaultMarket: true,
            amount: _amount,
            to: _to,
            market: DEFAULT_AAVE_MARKET
        });
        _assertParams(params);
    }

    function testFuzz_encode_decode(
        uint16 _assetId,
        uint256 _amount,
        address _to,
        address _market
    ) public {
        AaveV3Withdraw.Params memory params = AaveV3Withdraw.Params({
            assetId: _assetId,
            useDefaultMarket: false,
            amount: _amount,
            to: _to,
            market: _market
        });
        _assertParams(params);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/

    function _assertParams(AaveV3Withdraw.Params memory _params) private {
        bytes memory encodedInputWithoutSelector = removeSelector(cut.encodeInputs(_params));
        AaveV3Withdraw.Params memory decodedParams = cut.decodeInputs(encodedInputWithoutSelector);
        
        assertEq(_params.assetId, decodedParams.assetId);
        assertEq(_params.useDefaultMarket, decodedParams.useDefaultMarket);
        assertEq(_params.amount, decodedParams.amount);
        assertEq(_params.to, decodedParams.to);
        assertEq(_params.market, decodedParams.market);
    }

    function _withdraw(uint256 _amount, bool _isL2Direct) internal {
        DataTypes.ReserveData memory wethData = pool.getReserveData(TokenAddresses.WETH_ADDR);

        uint256 bobBalanceBefore = bobBalance(TokenAddresses.WETH_ADDR);
        (uint256 walletATokenBalanceBefore,,,,,,,,) = dataProvider.getUserReserveData(TokenAddresses.WETH_ADDR, walletAddr);

        if (_isL2Direct) {
            AaveV3Withdraw.Params memory params = AaveV3Withdraw.Params({
                assetId: wethData.id,
                useDefaultMarket: true,
                amount: _amount,
                to: bob,
                market: address(0)
            });
            executeByWallet(address(cut), cut.encodeInputs(params), 0);
        }
        else {
            bytes memory paramsCalldata = aaveV3WithdrawEncode(
                wethData.id,
                true,
                _amount,
                bob,
                address(0)
            );

            bytes memory _calldata = abi.encodeWithSelector(
                AaveV3Withdraw.executeAction.selector,
                paramsCalldata,
                subData,
                paramMapping,
                returnValues
            );

            executeByWallet(address(cut), _calldata, 0);
        }

        uint256 bobBalanceAfter = bobBalance(TokenAddresses.WETH_ADDR);
        (uint256 walletATokenBalanceAfter,,,,,,,,) = dataProvider.getUserReserveData(TokenAddresses.WETH_ADDR, walletAddr);

        uint256 maxAtokenIncreaseTollerance = 10 wei;

        if (_amount == type(uint256).max) {
            assertApproxEqAbs(bobBalanceAfter, bobBalanceBefore + walletATokenBalanceBefore, maxAtokenIncreaseTollerance);
            assertEq(walletATokenBalanceAfter, 0);
        } else {
            assertEq(bobBalanceAfter, bobBalanceBefore + _amount);
            assertLt(walletATokenBalanceAfter, walletATokenBalanceBefore);
            assertApproxEqAbs(walletATokenBalanceAfter, walletATokenBalanceBefore - _amount, maxAtokenIncreaseTollerance);    
        }
    }

    function _supplyWeth(uint256 _amount) internal {
        DataTypes.ReserveData memory wethData = pool.getReserveData(TokenAddresses.WETH_ADDR);
        AaveV3Supply.Params memory supplyParams = AaveV3Supply.Params({
            amount: _amount,
            from: bob,
            assetId: wethData.id,
            useDefaultMarket: true,
            useOnBehalf: false,
            market: address(0),
            onBehalf: address(0)
        });

        executeAaveV3Supply(supplyParams, TokenAddresses.WETH_ADDR, false, aaveV3SupplyContractAddr);
    }
}
